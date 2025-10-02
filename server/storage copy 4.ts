import { type User, type InsertUser, type UpsertUser, type Alert, type InsertAlert, type AlertComment, type InsertAlertComment, type AlertValidation, type UserStats, type SystemStats } from "@shared/schema";
import { users, alerts, alertValidations, alertComments } from "@shared/schema";
import { db } from './db';
import { eq, desc, and, or, count, sql } from "drizzle-orm";
import { randomUUID, createHash } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByIdentity(identity: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  validateUserCredentials(identity: string, password: string): Promise<User | undefined>;

  // Alert methods
  getAlerts(options?: { limit?: number; status?: string; authorId?: string }): Promise<Alert[]>;
  getAlertsByAuthor(authorId: string): Promise<Alert[]>;
  getAlert(id: string): Promise<Alert | undefined>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  updateAlertStatus(id: string, status: string, authorId: string): Promise<Alert | undefined>;
  validateAlert(id: string, isConfirmed: boolean, userId: string): Promise<Alert | undefined>;
  deleteAlert(id: string, authorId: string): Promise<boolean>;

  // Comment methods
  getAlertComments(alertId: string): Promise<AlertComment[]>;
  createAlertComment(comment: InsertAlertComment): Promise<AlertComment>;

  // Stats methods
  getUserStats(userId: string): Promise<UserStats>;
  getSystemStats(): Promise<SystemStats>;

  // Admin methods
  getAllUsers(): Promise<User[]>;
  updateUserAdmin(id: string, updates: Partial<User>): Promise<User | undefined>;
}

export class PostgreSQLStorage implements IStorage {
  private userCache = new Map<string, { user: User; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000;

  private clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.userCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.userCache.delete(key);
      }
    }
  }

  private getCachedUser(key: string): User | undefined {
    this.clearExpiredCache();
    const cached = this.userCache.get(key);
    return cached ? cached.user : undefined;
  }

  private setCachedUser(key: string, user: User) {
    this.userCache.set(key, { user, timestamp: Date.now() });
  }

  private invalidateUserCache(userId: string) {
    this.userCache.delete(`id:${userId}`);
    for (const [key] of this.userCache.entries()) {
      if (key.startsWith('email:') || key.startsWith('phone:') || key.startsWith('identity:')) {
        this.userCache.delete(key);
      }
    }
  }

  private hashPassword(password: string): string {
    // Méthode de hashage simple pour le développement
    return createHash('sha256').update(password).digest('hex');
  }

  private verifyPassword(password: string, hashedPassword: string): boolean {
    const hashedInput = this.hashPassword(password);
    return hashedInput === hashedPassword;
  }

  async getUser(id: string): Promise<User | undefined> {
    try {
      const cacheKey = `id:${id}`;
      const cached = this.getCachedUser(cacheKey);
      if (cached) return cached;

      const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (user) this.setCachedUser(cacheKey, user);
      return user;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByIdentity(identity: string): Promise<User | undefined> {
    try {
      const cacheKey = `identity:${identity}`;
      const cached = this.getCachedUser(cacheKey);
      if (cached) return cached;

      const [user] = await db.select()
        .from(users)
        .where(or(eq(users.email, identity), eq(users.phone, identity)))
        .limit(1);

      if (user) this.setCachedUser(cacheKey, user);
      return user;
    } catch (error) {
      console.error('Error getting user by identity:', error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const cacheKey = `email:${email}`;
      const cached = this.getCachedUser(cacheKey);
      if (cached) return cached;

      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (user) this.setCachedUser(cacheKey, user);
      return user;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return undefined;
    }
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    try {
      const cacheKey = `phone:${phone}`;
      const cached = this.getCachedUser(cacheKey);
      if (cached) return cached;

      const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
      if (user) this.setCachedUser(cacheKey, user);
      return user;
    } catch (error) {
      console.error('Error getting user by phone:', error);
      return undefined;
    }
  }

  async validateUserCredentials(identity: string, password: string): Promise<User | undefined> {
    try {
      const user = await this.getUserByIdentity(identity);
      if (!user || !user.password) return undefined;

      // Vérification du mot de passe hashé
      const isValid = this.verifyPassword(password, user.password);
      return isValid ? user : undefined;
    } catch (error) {
      console.error('Error validating user credentials:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const now = new Date();

      // Hashage du mot de passe
      const hashedPassword = insertUser.password
        ? this.hashPassword(insertUser.password)
        : this.hashPassword('123456'); // Mot de passe par défaut

      const newUser = {
        id: randomUUID(),
        name: this.generateUserName(insertUser),
        ...insertUser,
        password: hashedPassword, // ✅ Mot de passe hashé
        cinUploadedFront: insertUser.cinUploadedFront ?? false,
        cinUploadedBack: insertUser.cinUploadedBack ?? false,
        cinUploadFrontUrl: insertUser.cinUploadFrontUrl ?? null,
        cinUploadBackUrl: insertUser.cinUploadBackUrl ?? null,
        cinVerified: insertUser.cinVerified ?? false,
        cinVerifiedAt: insertUser.cinVerifiedAt ?? null,
        cinVerifiedBy: insertUser.cinVerifiedBy ?? null,
        hasCIN: (insertUser.cinUploadedFront ?? false) && (insertUser.cinUploadedBack ?? false),
        joinedAt: now,
        createdAt: now,
        updatedAt: now,
        alertsCount: 0,
        validationsCount: 0,
      };

      const [user] = await db.insert(users).values(newUser).returning();

      this.invalidateUserCache(user.id);
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    try {
      // Hashage du mot de passe si fourni
      if (updates.password) {
        updates.password = this.hashPassword(updates.password);
      }

      // Mettre à jour hasCIN basé sur les uploads si fournis
      if ('cinUploadedFront' in updates || 'cinUploadedBack' in updates) {
        updates.hasCIN = (updates.cinUploadedFront ?? false) && (updates.cinUploadedBack ?? false);
      }

      const [updatedUser] = await db.update(users)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(users.id, id))
        .returning();

      if (updatedUser) {
        this.invalidateUserCache(id);
      }

      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
  }

  async upsertUser(upsertUser: UpsertUser): Promise<User> {
    try {
      if (upsertUser.id) {
        const existing = await this.getUser(upsertUser.id);
        if (existing) {
          return await this.updateUser(upsertUser.id, upsertUser) || existing;
        }
      }

      return await this.createUser(upsertUser as InsertUser);
    } catch (error) {
      console.error('Error upserting user:', error);
      throw error;
    }
  }

  async getAlerts(options?: { limit?: number; status?: string; authorId?: string }): Promise<Alert[]> {
    try {
      let query = db.select().from(alerts);

      const conditions = [];
      if (options?.status) {
        conditions.push(eq(alerts.status, options.status));
      }
      if (options?.authorId) {
        conditions.push(eq(alerts.authorId, options.authorId));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      query = query.orderBy(desc(alerts.createdAt));

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      return await query;
    } catch (error) {
      console.error('Error getting alerts:', error);
      return [];
    }
  }

  async getAlertsByAuthor(authorId: string): Promise<Alert[]> {
    try {
      return await db.select()
        .from(alerts)
        .where(eq(alerts.authorId, authorId))
        .orderBy(desc(alerts.createdAt));
    } catch (error) {
      console.error('Error getting alerts by author:', error);
      return [];
    }
  }

  async getAlert(id: string): Promise<Alert | undefined> {
    try {
      const [alert] = await db.select().from(alerts).where(eq(alerts.id, id)).limit(1);
      return alert;
    } catch (error) {
      console.error('Error getting alert:', error);
      return undefined;
    }
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    try {
      // ✅ CORRECTION : Suppression du cast SQL et utilisation directe des nombres
      const alertData = {
        id: randomUUID(),
        reason: insertAlert.reason,
        description: insertAlert.description,
        location: insertAlert.location,
        latitude: insertAlert.latitude, // ✅ Utilisation directe du number
        longitude: insertAlert.longitude, // ✅ Utilisation directe du number
        urgency: insertAlert.urgency || 'medium',
        authorId: insertAlert.authorId,
        media: insertAlert.media || [],
        status: 'pending',
        confirmedCount: 0,
        rejectedCount: 0,
        createdAt: new Date(),
      };

      const [alert] = await db.insert(alerts).values(alertData).returning();

      if (alert.authorId) {
        await this.incrementUserAlertsCount(alert.authorId);
      }

      return alert;
    } catch (error) {
      console.error('Error creating alert:', error);
      throw error;
    }
  }

  async updateAlertStatus(id: string, status: string, authorId: string): Promise<Alert | undefined> {
    try {
      if (status === 'resolved') {
        const alert = await this.getAlert(id);
        if (!alert || alert.authorId !== authorId) {
          return undefined;
        }
      }

      const updates: any = { status };
      if (status === 'resolved') {
        updates.resolvedAt = new Date();
      }

      const [updatedAlert] = await db.update(alerts)
        .set(updates)
        .where(eq(alerts.id, id))
        .returning();

      return updatedAlert;
    } catch (error) {
      console.error('Error updating alert status:', error);
      return undefined;
    }
  }

  async validateAlert(id: string, isConfirmed: boolean, userId: string): Promise<Alert | undefined> {
    try {
      const alert = await this.getAlert(id);
      if (!alert) return undefined;

      const existingValidation = await db.select()
        .from(alertValidations)
        .where(and(
          eq(alertValidations.alertId, id),
          eq(alertValidations.userId, userId)
        ))
        .limit(1);

      if (existingValidation.length > 0) {
        throw new Error("User has already voted");
      }

      await db.insert(alertValidations).values({
        id: randomUUID(),
        alertId: id,
        userId: userId,
        isValid: isConfirmed,
      });

      const validations = await db.select()
        .from(alertValidations)
        .where(eq(alertValidations.alertId, id));

      const newConfirmed = validations.filter(v => v.isValid).length;
      const newRejected = validations.filter(v => !v.isValid).length;

      const updates: any = {
        confirmedCount: newConfirmed,
        rejectedCount: newRejected,
      };

      if (newConfirmed >= 3) {
        updates.status = 'confirmed';
      } else if (newRejected >= 2) {
        updates.status = 'fake';
      }

      const [updatedAlert] = await db.update(alerts)
        .set(updates)
        .where(eq(alerts.id, id))
        .returning();

      await this.incrementUserValidationsCount(userId);

      return updatedAlert;
    } catch (error) {
      console.error('Error validating alert:', error);
      throw error;
    }
  }

  async getAlertComments(alertId: string): Promise<AlertComment[]> {
    try {
      return await db.select().from(alertComments)
        .where(eq(alertComments.alertId, alertId))
        .orderBy(desc(alertComments.createdAt));
    } catch (error) {
      console.error('Error getting alert comments:', error);
      return [];
    }
  }

  async createAlertComment(insertComment: InsertAlertComment): Promise<AlertComment> {
    try {
      const [comment] = await db.insert(alertComments).values({
        ...insertComment,
      }).returning();
      return comment;
    } catch (error) {
      console.error('Error creating alert comment:', error);
      throw error;
    }
  }

  async deleteAlert(id: string, authorId: string): Promise<boolean> {
    try {
      const alert = await this.getAlert(id);
      if (!alert) return false;

      // Si c'est l'auteur, OK direct
      if (alert.authorId === authorId) {
        await db.delete(alerts).where(eq(alerts.id, id));
        return true;
      }

      // Sinon, check si requester est admin
      const requester = await this.getUser(authorId);
      if (!requester || !requester.isAdmin) {
        return false;
      }

      // Admin peut supprimer
      await db.delete(alerts).where(eq(alerts.id, id));
      
      return true;
    } catch (error) {
      console.error('Error deleting alert:', error);
      return false;
    }
  }

  async getUserStats(userId: string): Promise<UserStats> {
    try {
      const user = await this.getUser(userId);
      if (!user) {
        return { alertsCount: 0, validationsCount: 0, confirmedAlertsCount: 0, fakeAlertsCount: 0 };
      }

      const alertsResult = await db.select({ count: count() }).from(alerts).where(eq(alerts.authorId, userId));
      const confirmedResult = await db.select({ count: count() }).from(alerts).where(and(eq(alerts.authorId, userId), eq(alerts.status, 'confirmed')));
      const fakeResult = await db.select({ count: count() }).from(alerts).where(and(eq(alerts.authorId, userId), eq(alerts.status, 'fake')));

      return {
        alertsCount: user.alertsCount || 0,
        validationsCount: user.validationsCount || 0,
        confirmedAlertsCount: confirmedResult[0]?.count || 0,
        fakeAlertsCount: fakeResult[0]?.count || 0,
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return { alertsCount: 0, validationsCount: 0, confirmedAlertsCount: 0, fakeAlertsCount: 0 };
    }
  }

  async getSystemStats(): Promise<SystemStats> {
    try {
      const usersResult = await db.select({ count: count() }).from(users);
      const alertsResult = await db.select({ count: count() }).from(alerts);
      const confirmedAlertsResult = await db.select({ count: count() }).from(alerts).where(eq(alerts.status, 'confirmed'));
      const pendingAlertsResult = await db.select({ count: count() }).from(alerts).where(eq(alerts.status, 'pending'));
      const resolvedAlertsResult = await db.select({ count: count() }).from(alerts).where(eq(alerts.status, 'resolved'));
      const validationsResult = await db.select({ count: count() }).from(alertValidations);

      return {
        usersCount: usersResult[0]?.count || 0,
        alertsCount: alertsResult[0]?.count || 0,
        confirmedAlertsCount: confirmedAlertsResult[0]?.count || 0,
        pendingAlertsCount: pendingAlertsResult[0]?.count || 0,
        resolvedAlertsCount: resolvedAlertsResult[0]?.count || 0,
        validationsCount: validationsResult[0]?.count || 0,
      };
    } catch (error) {
      console.error('Error getting system stats:', error);
      return { usersCount: 0, alertsCount: 0, confirmedAlertsCount: 0, pendingAlertsCount: 0, resolvedAlertsCount: 0, validationsCount: 0 };
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      return await db.select().from(users).orderBy(desc(users.createdAt));
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  async updateUserAdmin(id: string, updates: Partial<User>): Promise<User | undefined> {
    try {
      if (updates.password) {
        updates.password = this.hashPassword(updates.password);
      }

      // Mettre à jour hasCIN basé sur les uploads si fournis
      if ('cinUploadedFront' in updates || 'cinUploadedBack' in updates) {
        updates.hasCIN = (updates.cinUploadedFront ?? false) && (updates.cinUploadedBack ?? false);
      }

      const [updatedUser] = await db.update(users)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(users.id, id))
        .returning();

      if (updatedUser) {
        this.invalidateUserCache(id);
      }

      return updatedUser;
    } catch (error) {
      console.error('Error updating user as admin:', error);
      return undefined;
    }
  }

  private generateUserName(userData: InsertUser | UpsertUser): string {
    if (userData.name) {
      return userData.name;
    }
    if (userData.firstName && userData.lastName) {
      return `${userData.firstName} ${userData.lastName}`;
    }
    if (userData.firstName) {
      return userData.firstName;
    }
    if (userData.lastName) {
      return userData.lastName;
    }
    return `Utilisateur ${userData.phone?.slice(-4) || ''}`.trim();
  }

  private async incrementUserAlertsCount(userId: string): Promise<void> {
    try {
      await db.update(users)
        .set({
          alertsCount: sql`${users.alertsCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
    } catch (error) {
      console.error('Error incrementing user alerts count:', error);
    }
  }

  private async incrementUserValidationsCount(userId: string): Promise<void> {
    try {
      await db.update(users)
        .set({
          validationsCount: sql`${users.validationsCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
    } catch (error) {
      console.error('Error incrementing user validations count:', error);
    }
  }
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private alerts: Map<string, Alert>;
  private alertValidations: Map<string, AlertValidation>;
  private comments: Map<string, AlertComment>;

  constructor() {
    this.users = new Map();
    this.alerts = new Map();
    this.alertValidations = new Map();
    this.comments = new Map();
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    const hashedPassword = this.hashPassword('123456');

    const defaultUsers: User[] = [
      {
        id: 'usr_naina_001',
        name: 'Naina Razafy',
        email: 'naina.razafy@gmail.com',
        firstName: 'Naina',
        lastName: 'Razafy',
        profileImageUrl: 'https://images.unsplash.com/photo-1494790108755-2616b169db2c?w=96&h=96&fit=crop&crop=face',
        phone: '+261321234567',
        password: hashedPassword, // ✅ Mot de passe hashé
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b169db2c?w=96&h=96&fit=crop&crop=face',
        hasCIN: true,
        cinUploadedFront: true,
        cinUploadedBack: true,
        cinUploadFrontUrl: '/uploads/cin/naina_usr_naina_001_front.jpg',
        cinUploadBackUrl: '/uploads/cin/naina_usr_naina_001_back.jpg',
        cinVerified: false,
        cinVerifiedAt: null,
        cinVerifiedBy: null,
        isAdmin: false,
        neighborhood: 'Antananarivo',
        latitude: -18.8792,
        longitude: 47.5079,
        joinedAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        alertsCount: 5,
        validationsCount: 23,
      },
      {
        id: 'usr_hery_002',
        name: 'Hery Andriana',
        email: 'hery@example.com',
        firstName: 'Hery',
        lastName: 'Andriana',
        profileImageUrl: null,
        phone: '+261331234568',
        password: hashedPassword, // ✅ Mot de passe hashé
        avatar: null,
        hasCIN: true,
        cinUploadedFront: true,
        cinUploadedBack: true,
        cinUploadFrontUrl: '/uploads/cin/hery_usr_hery_002_front.jpg',
        cinUploadBackUrl: '/uploads/cin/hery_usr_hery_002_back.jpg',
        cinVerified: false,
        cinVerifiedAt: null,
        cinVerifiedBy: null,
        isAdmin: false,
        neighborhood: 'Antsirabe',
        latitude: -19.8639,
        longitude: 46.0453,
        joinedAt: new Date('2024-01-02'),
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
        alertsCount: 3,
        validationsCount: 15,
      },
      {
        id: 'usr_admin_001',
        name: 'Administrateur',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'System',
        profileImageUrl: null,
        phone: '+261341234569',
        password: hashedPassword, // ✅ Mot de passe hashé
        avatar: null,
        hasCIN: false,
        cinUploadedFront: false,
        cinUploadedBack: false,
        cinUploadFrontUrl: null,
        cinUploadBackUrl: null,
        cinVerified: false,
        cinVerifiedAt: null,
        cinVerifiedBy: null,
        isAdmin: true,
        neighborhood: 'Antananarivo',
        latitude: -18.8792,
        longitude: 47.5079,
        joinedAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        alertsCount: 0,
        validationsCount: 0,
      }
    ];

    defaultUsers.forEach(user => this.users.set(user.id, user));

    const defaultAlerts: Alert[] = [
      {
        id: 'alert_001',
        reason: 'Agression',
        description: 'Tentative d\'agression signalée près du marché',
        location: 'Analakely, Antananarivo',
        status: 'pending',
        urgency: 'high',
        authorId: 'usr_naina_001',
        confirmedCount: 2,
        rejectedCount: 0,
        media: [],
        createdAt: new Date(Date.now() - 15 * 60 * 1000),
      },
      {
        id: 'alert_002',
        reason: 'Vol',
        description: 'Vol à la tire signalé dans la zone',
        location: 'Andravoahangy, Antananarivo',
        status: 'confirmed',
        urgency: 'medium',
        authorId: 'usr_hery_002',
        confirmedCount: 5,
        rejectedCount: 1,
        media: [],
        createdAt: new Date(Date.now() - 60 * 60 * 1000),
      }
    ];

    defaultAlerts.forEach(alert => this.alerts.set(alert.id, alert));

    const defaultValidations: AlertValidation[] = [
      {
        id: randomUUID(),
        alertId: 'alert_001',
        userId: 'usr_hery_002',
        isValid: true,
        validatedAt: new Date(Date.now() - 10 * 60 * 1000),
      },
      {
        id: randomUUID(),
        alertId: 'alert_001',
        userId: 'usr_admin_001',
        isValid: true,
        validatedAt: new Date(Date.now() - 5 * 60 * 1000),
      },
      // Add more for alert_002 if needed
    ];

    defaultValidations.forEach(validation => this.alertValidations.set(validation.id, validation));

    const defaultComments: AlertComment[] = [
      {
        id: randomUUID(),
        alertId: 'alert_001',
        userId: 'usr_hery_002',
        type: 'text',
        content: 'J\'ai vu quelque chose de similaire hier.',
        createdAt: new Date(Date.now() - 8 * 60 * 1000),
        updatedAt: new Date(Date.now() - 8 * 60 * 1000),
      },
    ];

    defaultComments.forEach(comment => this.comments.set(comment.id, comment));
  }

  private hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
  }

  private verifyPassword(password: string, hashedPassword: string): boolean {
    const hashedInput = this.hashPassword(password);
    return hashedInput === hashedPassword;
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByIdentity(identity: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user =>
      user.email === identity || user.phone === identity
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.phone === phone);
  }

  async validateUserCredentials(identity: string, password: string): Promise<User | undefined> {
    try {
      const user = await this.getUserByIdentity(identity);
      if (!user || !user.password) return undefined;

      const isValid = this.verifyPassword(password, user.password);
      return isValid ? user : undefined;
    } catch (error) {
      console.error("Error validating user credentials:", error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const now = new Date();
    const hashedPassword = insertUser.password
      ? this.hashPassword(insertUser.password)
      : this.hashPassword('123456');

    const user: User = {
      id,
      name: this.generateUserName(insertUser),
      ...insertUser,
      password: hashedPassword,
      cinUploadedFront: insertUser.cinUploadedFront ?? false,
      cinUploadedBack: insertUser.cinUploadedBack ?? false,
      cinUploadFrontUrl: insertUser.cinUploadFrontUrl ?? null,
      cinUploadBackUrl: insertUser.cinUploadBackUrl ?? null,
      cinVerified: insertUser.cinVerified ?? false,
      cinVerifiedAt: insertUser.cinVerifiedAt ?? null,
      cinVerifiedBy: insertUser.cinVerifiedBy ?? null,
      hasCIN: (insertUser.cinUploadedFront ?? false) && (insertUser.cinUploadedBack ?? false),
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
      alertsCount: 0,
      validationsCount: 0,
    };

    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const existing = this.users.get(id);
    if (!existing) return undefined;

    if (updates.password) {
      updates.password = this.hashPassword(updates.password);
    }

    // Mettre à jour hasCIN basé sur les uploads si fournis
    if ('cinUploadedFront' in updates || 'cinUploadedBack' in updates) {
      updates.hasCIN = (updates.cinUploadedFront ?? existing.cinUploadedFront) && (updates.cinUploadedBack ?? existing.cinUploadedBack);
    }

    const updatedUser: User = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    if (userData.id && this.users.has(userData.id)) {
      return (await this.updateUser(userData.id, userData))!;
    } else {
      return await this.createUser(userData as InsertUser);
    }
  }

  async getAlerts(options?: { limit?: number; status?: string; authorId?: string }): Promise<Alert[]> {
    let alertsArray = Array.from(this.alerts.values())
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());

    if (options?.status) {
      alertsArray = alertsArray.filter(alert => alert.status === options.status);
    }

    if (options?.authorId) {
      alertsArray = alertsArray.filter(alert => alert.authorId === options.authorId);
    }

    if (options?.limit) {
      alertsArray = alertsArray.slice(0, options.limit);
    }

    return alertsArray;
  }

  async getAlertsByAuthor(authorId: string): Promise<Alert[]> {
    return Array.from(this.alerts.values())
      .filter(alert => alert.authorId === authorId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getAlert(id: string): Promise<Alert | undefined> {
    return this.alerts.get(id);
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const id = randomUUID();
    const now = new Date();
    const alert: Alert = {
      id,
      reason: insertAlert.reason,
      description: insertAlert.description,
      location: insertAlert.location,
      latitude: insertAlert.latitude,
      longitude: insertAlert.longitude,
      urgency: insertAlert.urgency || 'medium',
      authorId: insertAlert.authorId,
      media: insertAlert.media || [],
      status: 'pending',
      confirmedCount: 0,
      rejectedCount: 0,
      createdAt: now,
    };

    this.alerts.set(id, alert);

    if (alert.authorId) {
      await this.incrementUserAlertsCount(alert.authorId);
    }

    return alert;
  }

  async updateAlertStatus(id: string, status: string, authorId: string): Promise<Alert | undefined> {
    const alert = this.alerts.get(id);
    if (!alert) return undefined;

    if (status === 'resolved' && alert.authorId !== authorId) {
      return undefined;
    }

    const updatedAlert: Alert = {
      ...alert,
      status,
      ...(status === 'resolved' ? { resolvedAt: new Date() } : {}),
    };

    this.alerts.set(id, updatedAlert);
    return updatedAlert;
  }

  async validateAlert(id: string, isConfirmed: boolean, userId: string): Promise<Alert | undefined> {
    const alert = this.alerts.get(id);
    if (!alert) return undefined;

    const existingValidation = Array.from(this.alertValidations.values()).find(v =>
      v.alertId === id && v.userId === userId
    );

    if (existingValidation) {
      throw new Error("User has already voted");
    }

    const newValidation: AlertValidation = {
      id: randomUUID(),
      alertId: id,
      userId,
      isValid: isConfirmed,
      validatedAt: new Date(),
    };

    this.alertValidations.set(newValidation.id, newValidation);

    const validations = Array.from(this.alertValidations.values()).filter(v => v.alertId === id);
    const newConfirmed = validations.filter(v => v.isValid).length;
    const newRejected = validations.length - newConfirmed;

    let updatedAlert: Alert = {
      ...alert,
      confirmedCount: newConfirmed,
      rejectedCount: newRejected,
    };

    if (newConfirmed >= 3) {
      updatedAlert.status = 'confirmed';
    } else if (newRejected >= 2) {
      updatedAlert.status = 'fake';
    }

    this.alerts.set(id, updatedAlert);
    await this.incrementUserValidationsCount(userId);

    return updatedAlert;
  }

  async getAlertComments(alertId: string): Promise<AlertComment[]> {
    return Array.from(this.comments.values())
      .filter(comment => comment.alertId === alertId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async createAlertComment(insertComment: InsertAlertComment): Promise<AlertComment> {
    const id = randomUUID();
    const now = new Date();
    const comment: AlertComment = {
      id,
      ...insertComment,
      createdAt: now,
      updatedAt: now,
    };

    this.comments.set(id, comment);
    return comment;
  }

  async deleteAlert(id: string, authorId: string): Promise<boolean> {
    const alert = this.alerts.get(id);
    if (!alert) return false;

    const requester = this.users.get(authorId);
    if (alert.authorId === authorId || (requester && requester.isAdmin)) {
      return this.alerts.delete(id);
    }

    return false;
  }

  async getUserStats(userId: string): Promise<UserStats> {
    const user = this.users.get(userId);
    if (!user) {
      return { alertsCount: 0, validationsCount: 0, confirmedAlertsCount: 0, fakeAlertsCount: 0 };
    }

    const userAlerts = Array.from(this.alerts.values()).filter(a => a.authorId === userId);
    const confirmedAlerts = userAlerts.filter(a => a.status === 'confirmed').length;
    const fakeAlerts = userAlerts.filter(a => a.status === 'fake').length;

    return {
      alertsCount: user.alertsCount || 0,
      validationsCount: user.validationsCount || 0,
      confirmedAlertsCount: confirmedAlerts,
      fakeAlertsCount: fakeAlerts,
    };
  }

  async getSystemStats(): Promise<SystemStats> {
    const usersCount = this.users.size;
    const alertsArray = Array.from(this.alerts.values());
    const alertsCount = alertsArray.length;
    const confirmedAlertsCount = alertsArray.filter(alert => alert.status === 'confirmed').length;
    const pendingAlertsCount = alertsArray.filter(alert => alert.status === 'pending').length;
    const resolvedAlertsCount = alertsArray.filter(alert => alert.status === 'resolved').length;
    const validationsCount = this.alertValidations.size;

    return { 
      usersCount, 
      alertsCount, 
      confirmedAlertsCount, 
      pendingAlertsCount, 
      resolvedAlertsCount, 
      validationsCount 
    };
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values()).sort((a, b) =>
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async updateUserAdmin(id: string, updates: Partial<User>): Promise<User | undefined> {
    return this.updateUser(id, updates);
  }

  private generateUserName(userData: InsertUser | UpsertUser): string {
    if (userData.name) {
      return userData.name;
    }
    if (userData.firstName && userData.lastName) {
      return `${userData.firstName} ${userData.lastName}`;
    }
    if (userData.firstName) {
      return userData.firstName;
    }
    if (userData.lastName) {
      return userData.lastName;
    }
    return `Utilisateur ${userData.phone?.slice(-4) || ''}`.trim();
  }

  private async incrementUserAlertsCount(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.alertsCount = (user.alertsCount || 0) + 1;
      user.updatedAt = new Date();
    }
  }

  private async incrementUserValidationsCount(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.validationsCount = (user.validationsCount || 0) + 1;
      user.updatedAt = new Date();
    }
  }
}

export const storage = process.env.DATABASE_URL
  ? new PostgreSQLStorage()
  : new MemStorage();