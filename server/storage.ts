// storage.ts - Updated with liberer support
import { type User, type InsertUser, type UpsertUser, type Alert, type InsertAlert, type AlertComment, type InsertAlertComment, type AlertValidation, type UserStats, type SystemStats, type AlertView, type InsertAlertView, type Liberer, type InsertLiberer, type LibererComment, type InsertLibererComment } from "@shared/schema";
import { users, alerts, alertValidations, alertComments, alertViews, liberer, libererComments } from "@shared/schema";
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
  updateAlert(id: string, updates: Partial<Alert>, updaterId: string): Promise<Alert | undefined>; // ✅ AJOUTÉ
  updateAlertStatus(id: string, status: string, authorId: string): Promise<Alert | undefined>;
  validateAlert(id: string, isConfirmed: boolean, userId: string): Promise<Alert | undefined>;
  deleteAlert(id: string, authorId: string): Promise<boolean>;
  recordView(alertId: string, userId: string): Promise<boolean>; // ✅ AJOUTÉ: Retourne true si vue incrémentée

  // Comment methods
  getAlertComments(alertId: string): Promise<AlertComment[]>;
  createAlertComment(comment: InsertAlertComment): Promise<AlertComment>;

  // Liberer methods
  getLiberers(options?: { limit?: number; status?: string; authorId?: string }): Promise<Liberer[]>;
  getLiberersByAuthor(authorId: string): Promise<Liberer[]>;
  getLiberer(id: string): Promise<Liberer | undefined>;
  createLiberer(liberer: InsertLiberer): Promise<Liberer>;
  updateLiberer(id: string, updates: Partial<Liberer>, updaterId: string): Promise<Liberer | undefined>;
  updateLibererStatus(id: string, status: string, authorId: string): Promise<Liberer | undefined>;
  updateLibererValidation(id: string, validation: boolean, authorId: string): Promise<Liberer | undefined>; // ✅ AJOUTÉ: Pour le champ validation booléen
  deleteLiberer(id: string, authorId: string): Promise<boolean>;

  // Liberer Comment methods
  getLibererComments(libererId: string): Promise<LibererComment[]>;
  createLibererComment(comment: InsertLibererComment): Promise<LibererComment>;

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

  // ✅ AJOUTÉ: Méthode pour mettre à jour une alerte (par auteur ou admin)
  async updateAlert(id: string, updates: Partial<Alert>, updaterId: string): Promise<Alert | undefined> {
    try {
      const alert = await this.getAlert(id);
      if (!alert) return undefined;

      const updater = await this.getUser(updaterId);
      if (!updater || (updater.id !== alert.authorId && !updater.isAdmin)) {
        return undefined;
      }

      // Champs autorisés à mettre à jour (exclut id, status, counts, etc.)
      const allowedUpdates: Partial<Alert> = {
        reason: updates.reason,
        description: updates.description,
        location: updates.location,
        latitude: updates.latitude,
        longitude: updates.longitude,
        urgency: updates.urgency,
        // media: updates.media, // Si vous voulez permettre la mise à jour des médias, décommentez
      };

      const [updatedAlert] = await db.update(alerts)
        .set({
          ...allowedUpdates,
          updatedAt: new Date()
        })
        .where(eq(alerts.id, id))
        .returning();

      return updatedAlert;
    } catch (error) {
      console.error('Error updating alert:', error);
      return undefined;
    }
  }

  // ✅ AJOUTÉ: Méthode pour enregistrer une vue (incrémente seulement si pas déjà vue par l'utilisateur)
  async recordView(alertId: string, userId: string): Promise<boolean> {
    try {
      // Vérifier si la vue existe déjà
      const existingView = await db.select()
        .from(alertViews)
        .where(and(eq(alertViews.alertId, alertId), eq(alertViews.userId, userId)))
        .limit(1);

      if (existingView.length > 0) {
        return false; // Déjà vu, pas d'incrément
      }

      // Insérer la vue et incrémenter le compteur
      await db.transaction(async (tx) => {
        await tx.insert(alertViews).values({
          id: randomUUID(),
          alertId,
          userId,
          viewedAt: new Date(),
        });

        await tx.update(alerts)
          .set(sql`${alerts.view} + 1`, { updatedAt: new Date() })
          .where(eq(alerts.id, alertId));
      });

      return true; // Vue incrémentée
    } catch (error) {
      console.error('Error recording view:', error);
      return false;
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

  // ✅ AJOUTÉ: Méthodes pour liberer

  async getLiberers(options?: { limit?: number; status?: string; authorId?: string }): Promise<Liberer[]> {
    try {
      let query = db.select().from(liberer);

      const conditions = [];
      if (options?.status) {
        conditions.push(eq(liberer.status, options.status));
      }
      if (options?.authorId) {
        conditions.push(eq(liberer.authorId, options.authorId));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      query = query.orderBy(desc(liberer.createdAt));

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      return await query;
    } catch (error) {
      console.error('Error getting liberers:', error);
      return [];
    }
  }

  async getLiberersByAuthor(authorId: string): Promise<Liberer[]> {
    try {
      return await db.select()
        .from(liberer)
        .where(eq(liberer.authorId, authorId))
        .orderBy(desc(liberer.createdAt));
    } catch (error) {
      console.error('Error getting liberers by author:', error);
      return [];
    }
  }

  async getLiberer(id: string): Promise<Liberer | undefined> {
    try {
      const [liber] = await db.select().from(liberer).where(eq(liberer.id, id)).limit(1);
      return liber;
    } catch (error) {
      console.error('Error getting liberer:', error);
      return undefined;
    }
  }

  async createLiberer(insertLiberer: InsertLiberer): Promise<Liberer> {
    try {
      const libererData = {
        id: randomUUID(),
        personName: insertLiberer.personName,
        personDescription: insertLiberer.personDescription,
        personImageUrl: insertLiberer.personImageUrl,
        arrestVideoUrl: insertLiberer.arrestVideoUrl,
        arrestDescription: insertLiberer.arrestDescription,
        location: insertLiberer.location,
        status: 'pending',
        validation: insertLiberer.validation || false,
        arrestDate: new Date(insertLiberer.arrestDate),
        arrestedBy: insertLiberer.arrestedBy,
        authorId: insertLiberer.authorId,
        view: 0,
        createdAt: new Date(),
      };

      const [liber] = await db.insert(liberer).values(libererData).returning();

      if (liber.authorId) {
        await this.incrementUserAlertsCount(liber.authorId); // Réutiliser pour liberer aussi ?
      }

      return liber;
    } catch (error) {
      console.error('Error creating liberer:', error);
      throw error;
    }
  }

  async updateLiberer(id: string, updates: Partial<Liberer>, updaterId: string): Promise<Liberer | undefined> {
    try {
      const liber = await this.getLiberer(id);
      if (!liber) return undefined;

      const updater = await this.getUser(updaterId);
      if (!updater || (updater.id !== liber.authorId && !updater.isAdmin)) {
        return undefined;
      }

      // Champs autorisés à mettre à jour (exclut id, status, etc.)
      const allowedUpdates: Partial<Liberer> = {
        personName: updates.personName,
        personDescription: updates.personDescription,
        personImageUrl: updates.personImageUrl,
        arrestVideoUrl: updates.arrestVideoUrl,
        arrestDescription: updates.arrestDescription,
        location: updates.location,
        validation: updates.validation,
        arrestDate: updates.arrestDate,
        arrestedBy: updates.arrestedBy,
      };

      const [updatedLiberer] = await db.update(liberer)
        .set({
          ...allowedUpdates,
          updatedAt: new Date()
        })
        .where(eq(liberer.id, id))
        .returning();

      return updatedLiberer;
    } catch (error) {
      console.error('Error updating liberer:', error);
      return undefined;
    }
  }

  async updateLibererStatus(id: string, status: string, authorId: string): Promise<Liberer | undefined> {
    try {
      if (status === 'resolved') {
        const liber = await this.getLiberer(id);
        if (!liber || liber.authorId !== authorId) {
          return undefined;
        }
      }

      const updates: any = { status };
      if (status === 'resolved') {
        updates.resolvedAt = new Date();
      }

      const [updatedLiberer] = await db.update(liberer)
        .set(updates)
        .where(eq(liberer.id, id))
        .returning();

      return updatedLiberer;
    } catch (error) {
      console.error('Error updating liberer status:', error);
      return undefined;
    }
  }

  async updateLibererValidation(id: string, validation: boolean, authorId: string): Promise<Liberer | undefined> {
    try {
      const liber = await this.getLiberer(id);
      if (!liber || liber.authorId !== authorId) {
        return undefined;
      }

      const [updatedLiberer] = await db.update(liberer)
        .set({ validation, updatedAt: new Date() })
        .where(eq(liberer.id, id))
        .returning();

      return updatedLiberer;
    } catch (error) {
      console.error('Error updating liberer validation:', error);
      return undefined;
    }
  }

  async deleteLiberer(id: string, authorId: string): Promise<boolean> {
    try {
      const liber = await this.getLiberer(id);
      if (!liber) return false;

      // Si c'est l'auteur, OK direct
      if (liber.authorId === authorId) {
        await db.delete(liberer).where(eq(liberer.id, id));
        return true;
      }

      // Sinon, check si requester est admin
      const requester = await this.getUser(authorId);
      if (!requester || !requester.isAdmin) {
        return false;
      }

      // Admin peut supprimer
      await db.delete(liberer).where(eq(liberer.id, id));
      
      return true;
    } catch (error) {
      console.error('Error deleting liberer:', error);
      return false;
    }
  }

  async getLibererComments(libererId: string): Promise<LibererComment[]> {
    try {
      return await db.select().from(libererComments)
        .where(eq(libererComments.libererId, libererId))
        .orderBy(desc(libererComments.createdAt));
    } catch (error) {
      console.error('Error getting liberer comments:', error);
      return [];
    }
  }

  async createLibererComment(insertComment: InsertLibererComment): Promise<LibererComment> {
    try {
      const [comment] = await db.insert(libererComments).values({
        ...insertComment,
      }).returning();
      return comment;
    } catch (error) {
      console.error('Error creating liberer comment:', error);
      throw error;
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
      return {
        usersCount: 0,
        alertsCount: 0,
        confirmedAlertsCount: 0,
        pendingAlertsCount: 0,
        resolvedAlertsCount: 0,
        validationsCount: 0,
      };
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
    return await this.updateUser(id, updates);
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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private alerts: Map<string, Alert>;
  private alertValidations: Map<string, AlertValidation>;
  private comments: Map<string, AlertComment>;
  private alertViews: Map<string, AlertView>; // ✅ AJOUTÉ: Map pour les vues
  private liberers: Map<string, Liberer>; // ✅ AJOUTÉ: Map pour liberer
  private libererComments: Map<string, LibererComment>; // ✅ AJOUTÉ: Map pour commentaires liberer

  constructor() {
    this.users = new Map();
    this.alerts = new Map();
    this.alertValidations = new Map();
    this.comments = new Map();
    this.alertViews = new Map();
    this.liberers = new Map();
    this.libererComments = new Map();
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
        view: 10, // ✅ AJOUTÉ: Valeur par défaut pour view
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
        view: 5, // ✅ AJOUTÉ: Valeur par défaut pour view
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

    // ✅ AJOUTÉ: Données par défaut pour les vues
    const defaultViews: AlertView[] = [
      {
        id: randomUUID(),
        alertId: 'alert_001',
        userId: 'usr_naina_001',
        viewedAt: new Date(Date.now() - 10 * 60 * 1000),
      },
      {
        id: randomUUID(),
        alertId: 'alert_002',
        userId: 'usr_hery_002',
        viewedAt: new Date(Date.now() - 20 * 60 * 1000),
      },
    ];

    defaultViews.forEach(view => this.alertViews.set(view.id, view));

    // ✅ AJOUTÉ: Données par défaut pour liberer
    const defaultLiberers: Liberer[] = [
      {
        id: 'liberer_001',
        personName: 'Jean Dupont',
        personDescription: 'Homme de 30 ans, cheveux noirs, portant un t-shirt bleu',
        personImageUrl: 'https://example.com/person1.jpg',
        arrestVideoUrl: 'https://example.com/arrest1.mp4',
        arrestDescription: 'Arrêté arbitrairement par la police lors d\'une manifestation pacifique',
        location: 'Place de l\'Indépendance, Antananarivo',
        status: 'pending',
        validation: false,
        arrestDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Il y a 2 jours
        arrestedBy: 'Police Nationale',
        authorId: 'usr_naina_001',
        view: 3,
        createdAt: new Date(Date.now() - 1 * 60 * 1000),
      },
      {
        id: 'liberer_002',
        personName: 'Marie Kuria',
        personDescription: 'Femme de 25 ans, dreadlocks, vêtements traditionnels',
        personImageUrl: 'https://example.com/person2.jpg',
        arrestVideoUrl: null,
        arrestDescription: 'Emmenée par les forces de l\'ordre sans motif clair',
        location: 'Rue Ravoninahitriniarivo, Fianarantsoa',
        status: 'confirmed',
        validation: true,
        arrestDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Hier
        arrestedBy: 'Gendarmerie',
        authorId: 'usr_hery_002',
        view: 7,
        createdAt: new Date(Date.now() - 30 * 60 * 1000),
      }
    ];

    defaultLiberers.forEach(liber => this.liberers.set(liber.id, liber));

    // ✅ AJOUTÉ: Données par défaut pour commentaires liberer
    const defaultLibererComments: LibererComment[] = [
      {
        id: randomUUID(),
        libererId: 'liberer_001',
        userId: 'usr_hery_002',
        type: 'text',
        content: 'J\'ai des infos sur cet arrestation, contactez-moi.',
        createdAt: new Date(Date.now() - 5 * 60 * 1000),
        updatedAt: new Date(Date.now() - 5 * 60 * 1000),
      },
    ];

    defaultLibererComments.forEach(comment => this.libererComments.set(comment.id, comment));
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

  // ✅ AJOUTÉ: Méthode pour mettre à jour une alerte (par auteur ou admin)
  async updateAlert(id: string, updates: Partial<Alert>, updaterId: string): Promise<Alert | undefined> {
    const alert = this.alerts.get(id);
    if (!alert) return undefined;

    const updater = this.users.get(updaterId);
    if (!updater || (updater.id !== alert.authorId && !updater.isAdmin)) {
      return undefined;
    }

    // Champs autorisés à mettre à jour (exclut id, status, counts, etc.)
    const allowedUpdates: Partial<Alert> = {
      reason: updates.reason,
      description: updates.description,
      location: updates.location,
      latitude: updates.latitude,
      longitude: updates.longitude,
      urgency: updates.urgency,
      // media: updates.media, // Si vous voulez permettre la mise à jour des médias, décommentez
    };

    const updatedAlert: Alert = {
      ...alert,
      ...allowedUpdates,
      updatedAt: new Date(),
    };

    this.alerts.set(id, updatedAlert);
    return updatedAlert;
  }

  // ✅ AJOUTÉ: Méthode pour enregistrer une vue (incrémente seulement si pas déjà vue par l'utilisateur)
  async recordView(alertId: string, userId: string): Promise<boolean> {
    // Vérifier si la vue existe déjà (clé composite alertId_userId)
    const existingViewKey = `${alertId}_${userId}`;
    if (Array.from(this.alertViews.values()).some(view => `${view.alertId}_${view.userId}` === existingViewKey)) {
      return false; // Déjà vu, pas d'incrément
    }

    // Créer et ajouter la vue
    const newView: AlertView = {
      id: randomUUID(),
      alertId,
      userId,
      viewedAt: new Date(),
    };
    this.alertViews.set(newView.id, newView);

    // Incrémenter le compteur de vues de l'alerte
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.view = (alert.view || 0) + 1;
      alert.updatedAt = new Date();
    }

    return true; // Vue incrémentée
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
      view: 0, // ✅ AJOUTÉ: Initialiser à 0
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

  // ✅ AJOUTÉ: Implémentations pour liberer

  async getLiberers(options?: { limit?: number; status?: string; authorId?: string }): Promise<Liberer[]> {
    let liberersArray = Array.from(this.liberers.values())
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());

    if (options?.status) {
      liberersArray = liberersArray.filter(liber => liber.status === options.status);
    }

    if (options?.authorId) {
      liberersArray = liberersArray.filter(liber => liber.authorId === options.authorId);
    }

    if (options?.limit) {
      liberersArray = liberersArray.slice(0, options.limit);
    }

    return liberersArray;
  }

  async getLiberersByAuthor(authorId: string): Promise<Liberer[]> {
    return Array.from(this.liberers.values())
      .filter(liber => liber.authorId === authorId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getLiberer(id: string): Promise<Liberer | undefined> {
    return this.liberers.get(id);
  }

  async createLiberer(insertLiberer: InsertLiberer): Promise<Liberer> {
    const id = randomUUID();
    const now = new Date();
    const liberer: Liberer = {
      id,
      personName: insertLiberer.personName,
      personDescription: insertLiberer.personDescription,
      personImageUrl: insertLiberer.personImageUrl,
      arrestVideoUrl: insertLiberer.arrestVideoUrl,
      arrestDescription: insertLiberer.arrestDescription,
      location: insertLiberer.location,
      status: 'pending',
      validation: insertLiberer.validation || false,
      arrestDate: new Date(insertLiberer.arrestDate),
      arrestedBy: insertLiberer.arrestedBy,
      authorId: insertLiberer.authorId,
      view: 0,
      createdAt: now,
    };

    this.liberers.set(id, liberer);

    if (liber.authorId) {
      await this.incrementUserAlertsCount(liberer.authorId); // Réutiliser pour liberer
    }

    return liberer;
  }

  async updateLiberer(id: string, updates: Partial<Liberer>, updaterId: string): Promise<Liberer | undefined> {
    const liber = this.liberers.get(id);
    if (!liber) return undefined;

    const updater = this.users.get(updaterId);
    if (!updater || (updater.id !== liber.authorId && !updater.isAdmin)) {
      return undefined;
    }

    // Champs autorisés à mettre à jour
    const allowedUpdates: Partial<Liberer> = {
      personName: updates.personName,
      personDescription: updates.personDescription,
      personImageUrl: updates.personImageUrl,
      arrestVideoUrl: updates.arrestVideoUrl,
      arrestDescription: updates.arrestDescription,
      location: updates.location,
      validation: updates.validation,
      arrestDate: updates.arrestDate,
      arrestedBy: updates.arrestedBy,
    };

    const updatedLiberer: Liberer = {
      ...liber,
      ...allowedUpdates,
      updatedAt: new Date(),
    };

    this.liberers.set(id, updatedLiberer);
    return updatedLiberer;
  }

  async updateLibererStatus(id: string, status: string, authorId: string): Promise<Liberer | undefined> {
    const liber = this.liberers.get(id);
    if (!liber) return undefined;

    if (status === 'resolved' && liber.authorId !== authorId) {
      return undefined;
    }

    const updatedLiberer: Liberer = {
      ...liber,
      status,
      ...(status === 'resolved' ? { resolvedAt: new Date() } : {}),
    };

    this.liberers.set(id, updatedLiberer);
    return updatedLiberer;
  }

  async updateLibererValidation(id: string, validation: boolean, authorId: string): Promise<Liberer | undefined> {
    const liber = this.liberers.get(id);
    if (!liber || liber.authorId !== authorId) {
      return undefined;
    }

    const updatedLiberer: Liberer = {
      ...liber,
      validation,
      updatedAt: new Date(),
    };

    this.liberers.set(id, updatedLiberer);
    return updatedLiberer;
  }

  async deleteLiberer(id: string, authorId: string): Promise<boolean> {
    const liber = this.liberers.get(id);
    if (!liber) return false;

    const requester = this.users.get(authorId);
    if (liber.authorId === authorId || (requester && requester.isAdmin)) {
      return this.liberers.delete(id);
    }

    return false;
  }

  async getLibererComments(libererId: string): Promise<LibererComment[]> {
    return Array.from(this.libererComments.values())
      .filter(comment => comment.libererId === libererId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async createLibererComment(insertComment: InsertLibererComment): Promise<LibererComment> {
    const id = randomUUID();
    const now = new Date();
    const comment: LibererComment = {
      id,
      ...insertComment,
      createdAt: now,
      updatedAt: now,
    };

    this.libererComments.set(id, comment);
    return comment;
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