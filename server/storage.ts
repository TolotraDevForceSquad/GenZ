// storage.ts - Updated with CIN Verification support
import { type User, type InsertUser, type UpsertUser, type Alert, type InsertAlert, type AlertComment, type InsertAlertComment, type AlertValidation, type UserStats, type SystemStats, type AlertView, type InsertAlertView, type Liberer, type InsertLiberer, type LibererComment, type InsertLibererComment, type CinVerification, type InsertCinVerification } from "@shared/schema";
import { users, alerts, alertValidations, alertComments, alertViews, liberer, libererComments, cinVerifications } from "@shared/schema";
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

  // CIN Verification methods
  getAllCinVerifications(options?: { status?: string; userId?: string; limit?: number }): Promise<CinVerification[]>;
  getCinVerification(id: string): Promise<CinVerification | undefined>;
  getCinVerificationByUserId(userId: string): Promise<CinVerification | undefined>;
  createCinVerification(cinVerif: InsertCinVerification): Promise<CinVerification>;
  updateCinVerification(id: string, updates: Partial<CinVerification>): Promise<CinVerification | undefined>;
  deleteCinVerification(id: string): Promise<boolean>;

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
        region: insertUser.region || null,
        updatedAt: now,
        alertsCount: 0,
        validationsCount: 0,
        isActive: true,
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
        region: updates.region,
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
        region: insertAlert.region || null,
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

      // Optionnel: Auto-update status si seuil atteint
      if (newConfirmed >= 3) {
        updates.status = 'confirmed';
      } else if (newRejected >= 2) {
        updates.status = 'fake';
      }

      const [updatedAlert] = await db.update(alerts)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(alerts.id, id))
        .returning();

      await this.incrementUserValidationsCount(userId);

      return updatedAlert;
    } catch (error) {
      console.error('Error validating alert:', error);
      throw error;
    }
  }

  async deleteAlert(id: string, authorId: string): Promise<boolean> {
    try {
      const alert = await this.getAlert(id);
      if (!alert) return false;

      const author = await this.getUser(authorId);
      if (!author || (alert.authorId !== authorId && !author.isAdmin)) {
        return false;
      }

      // Supprimer les validations associées
      await db.delete(alertValidations).where(eq(alertValidations.alertId, id));

      // Supprimer les vues associées
      await db.delete(alertViews).where(eq(alertViews.alertId, id));

      // Supprimer les commentaires associés
      await db.delete(alertComments).where(eq(alertComments.alertId, id));

      // Supprimer l'alerte
      const result = await db.delete(alerts).where(eq(alerts.id, id)).returning({ id: alerts.id });

      if (result.length > 0 && alert.authorId) {
        await this.decrementUserAlertsCount(alert.authorId);
      }

      return result.length > 0;
    } catch (error) {
      console.error('Error deleting alert:', error);
      return false;
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
      const now = new Date();
      const commentData = {
        id: randomUUID(),
        ...insertComment,
        createdAt: now,
        updatedAt: now,
      };

      const [comment] = await db.insert(alertComments).values(commentData).returning();
      return comment;
    } catch (error) {
      console.error('Error creating alert comment:', error);
      throw error;
    }
  }

  // ✅ AJOUTÉ: Implémentations pour liberer

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
      const now = new Date();
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
        createdAt: now,
        updatedAt: now,
      };

      const [liber] = await db.insert(liberer).values(libererData).returning();

      if (liber.authorId) {
        await this.incrementUserAlertsCount(liber.authorId); // Réutiliser pour liberer
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

      // Champs autorisés à mettre à jour
      const allowedUpdates: Partial<Liberer> = {
        personName: updates.personName,
        personDescription: updates.personDescription,
        personImageUrl: updates.personImageUrl,
        arrestVideoUrl: updates.arrestVideoUrl,
        arrestDescription: updates.arrestDescription,
        location: updates.location,
        validation: updates.validation,
        arrestDate: updates.arrestDate ? new Date(updates.arrestDate) : undefined,
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
        .set({
          validation,
          updatedAt: new Date()
        })
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

      const author = await this.getUser(authorId);
      if (!author || (liber.authorId !== authorId && !author.isAdmin)) {
        return false;
      }

      // Supprimer les commentaires associés
      await db.delete(libererComments).where(eq(libererComments.libererId, id));

      // Supprimer le liberer
      const result = await db.delete(liberer).where(eq(liberer.id, id)).returning({ id: liberer.id });

      if (result.length > 0 && liber.authorId) {
        await this.decrementUserAlertsCount(liber.authorId); // Réutiliser pour liberer
      }

      return result.length > 0;
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
      const now = new Date();
      const commentData = {
        id: randomUUID(),
        ...insertComment,
        createdAt: now,
        updatedAt: now,
      };

      const [comment] = await db.insert(libererComments).values(commentData).returning();
      return comment;
    } catch (error) {
      console.error('Error creating liberer comment:', error);
      throw error;
    }
  }

  // ✅ AJOUTÉ: Implémentations pour CIN Verifications

  async getAllCinVerifications(options?: { status?: string; userId?: string; limit?: number }): Promise<CinVerification[]> {
    try {
      let query = db.select().from(cinVerifications);

      const conditions = [];
      if (options?.status) {
        conditions.push(eq(cinVerifications.status, options.status));
      }
      if (options?.userId) {
        conditions.push(eq(cinVerifications.userId, options.userId));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      query = query.orderBy(desc(cinVerifications.createdAt));

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      return await query;
    } catch (error) {
      console.error('Error getting all CIN verifications:', error);
      return [];
    }
  }

  async getCinVerification(id: string): Promise<CinVerification | undefined> {
    try {
      const [verif] = await db.select().from(cinVerifications).where(eq(cinVerifications.id, id)).limit(1);
      return verif;
    } catch (error) {
      console.error('Error getting CIN verification:', error);
      return undefined;
    }
  }

  async getCinVerificationByUserId(userId: string): Promise<CinVerification | undefined> {
    try {
      const [verif] = await db.select().from(cinVerifications).where(eq(cinVerifications.userId, userId)).limit(1);
      return verif;
    } catch (error) {
      console.error('Error getting CIN verification by user ID:', error);
      return undefined;
    }
  }

  async createCinVerification(insertCinVerif: InsertCinVerification): Promise<CinVerification> {
    try {
      const now = new Date();
      const cinVerifData = {
        id: randomUUID(),
        userId: insertCinVerif.userId,
        lastName: insertCinVerif.lastName,
        firstName: insertCinVerif.firstName,
        birthDate: new Date(insertCinVerif.birthDate),
        birthPlace: insertCinVerif.birthPlace,
        address: insertCinVerif.address,
        issuePlace: insertCinVerif.issuePlace,
        issueDate: new Date(insertCinVerif.issueDate),
        cinNumber: insertCinVerif.cinNumber,
        cinUploadFrontUrl: insertCinVerif.cinUploadFrontUrl || null,
        cinUploadBackUrl: insertCinVerif.cinUploadBackUrl || null,
        status: insertCinVerif.status || 'pending',
        adminId: insertCinVerif.adminId,
        verifiedAt: insertCinVerif.verifiedAt ? new Date(insertCinVerif.verifiedAt) : null,
        notes: insertCinVerif.notes || '',
        createdAt: now,
        updatedAt: now,
      };

      const [verif] = await db.insert(cinVerifications).values(cinVerifData).returning();
      return verif;
    } catch (error) {
      console.error('Error creating CIN verification:', error);
      throw error;
    }
  }

  async updateCinVerification(id: string, updates: Partial<CinVerification>): Promise<CinVerification | undefined> {
    try {
      const existing = await this.getCinVerification(id);
      if (!existing) return undefined;

      // Convertir dates si fournies
      if (updates.birthDate) updates.birthDate = new Date(updates.birthDate as string);
      if (updates.issueDate) updates.issueDate = new Date(updates.issueDate as string);
      if (updates.verifiedAt) updates.verifiedAt = new Date(updates.verifiedAt as string);

      const [updatedVerif] = await db.update(cinVerifications)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(cinVerifications.id, id))
        .returning();

      return updatedVerif;
    } catch (error) {
      console.error('Error updating CIN verification:', error);
      return undefined;
    }
  }

  async deleteCinVerification(id: string): Promise<boolean> {
    try {
      const result = await db.delete(cinVerifications).where(eq(cinVerifications.id, id)).returning({ id: cinVerifications.id });
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting CIN verification:', error);
      return false;
    }
  }

  async getUserStats(userId: string): Promise<UserStats> {
    try {
      const user = await this.getUser(userId);
      if (!user) {
        return { alertsCount: 0, validationsCount: 0, confirmedAlertsCount: 0, fakeAlertsCount: 0 };
      }

      const userAlerts = await this.getAlertsByAuthor(userId);
      const confirmedAlerts = userAlerts.filter(a => a.status === 'confirmed').length;
      const fakeAlerts = userAlerts.filter(a => a.status === 'fake').length;

      return {
        alertsCount: user.alertsCount || 0,
        validationsCount: user.validationsCount || 0,
        confirmedAlertsCount: confirmedAlerts,
        fakeAlertsCount: fakeAlerts,
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return { alertsCount: 0, validationsCount: 0, confirmedAlertsCount: 0, fakeAlertsCount: 0 };
    }
  }

  async getSystemStats(): Promise<SystemStats> {
    try {
      const [usersCountResult] = await db.select({ count: count() }).from(users);
      const usersCount = Number(usersCountResult.count);

      const [alertsCountResult] = await db.select({ count: count() }).from(alerts);
      const alertsCount = Number(alertsCountResult.count);

      const [confirmedAlertsCountResult] = await db.select({ count: count() }).from(alerts).where(eq(alerts.status, 'confirmed'));
      const confirmedAlertsCount = Number(confirmedAlertsCountResult.count);

      const [pendingAlertsCountResult] = await db.select({ count: count() }).from(alerts).where(eq(alerts.status, 'pending'));
      const pendingAlertsCount = Number(pendingAlertsCountResult.count);

      const [resolvedAlertsCountResult] = await db.select({ count: count() }).from(alerts).where(eq(alerts.status, 'resolved'));
      const resolvedAlertsCount = Number(resolvedAlertsCountResult.count);

      const [validationsCountResult] = await db.select({ count: count() }).from(alertValidations);
      const validationsCount = Number(validationsCountResult.count);

      return { 
        usersCount, 
        alertsCount, 
        confirmedAlertsCount, 
        pendingAlertsCount, 
        resolvedAlertsCount, 
        validationsCount 
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
    // Pour l'admin, permettre tous les updates (y compris password sans hash, mais on hash quand même)
    if (updates.password) {
      updates.password = this.hashPassword(updates.password as string);
    }

    return await this.updateUser(id, updates);
  }

  private async incrementUserAlertsCount(userId: string): Promise<void> {
    try {
      await db.update(users)
        .set(sql`${users.alertsCount} + 1`, { updatedAt: new Date() })
        .where(eq(users.id, userId));
    } catch (error) {
      console.error('Error incrementing user alerts count:', error);
    }
  }

  private async decrementUserAlertsCount(userId: string): Promise<void> {
    try {
      await db.update(users)
        .set(sql`${users.alertsCount} - 1`, { updatedAt: new Date() })
        .where(eq(users.id, userId));
    } catch (error) {
      console.error('Error decrementing user alerts count:', error);
    }
  }

  private async incrementUserValidationsCount(userId: string): Promise<void> {
    try {
      await db.update(users)
        .set(sql`${users.validationsCount} + 1`, { updatedAt: new Date() })
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

// ✅ AJOUTÉ: Implémentation MemStorage pour CIN Verifications (pour cohérence, même si non utilisé en prod)
class MemStorage implements IStorage {
  users = new Map<string, User>();
  alerts = new Map<string, Alert>();
  alertValidations = new Map<string, AlertValidation>();
  comments = new Map<string, AlertComment>();
  alertViews = new Map<string, AlertView>();
  liberers = new Map<string, Liberer>();
  libererComments = new Map<string, LibererComment>();
  cinVerifications = new Map<string, CinVerification>(); // ✅ AJOUTÉ

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByIdentity(identity: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.email === identity || user.phone === identity) {
        return user;
      }
    }
    return undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return undefined;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.phone === phone) {
        return user;
      }
    }
    return undefined;
  }

  async validateUserCredentials(identity: string, password: string): Promise<User | undefined> {
    const user = await this.getUserByIdentity(identity);
    if (!user || !user.password) return undefined;

    const isValid = this.verifyPassword(password, user.password);
    return isValid ? user : undefined;
  }

  private hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
  }

  private verifyPassword(password: string, hashedPassword: string): boolean {
    const hashedInput = this.hashPassword(password);
    return hashedInput === hashedPassword;
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
      isActive: true,
    };

    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const existing = this.users.get(id);
    if (!existing) return undefined;

    if (updates.password) {
      updates.password = this.hashPassword(updates.password as string);
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
      // Supprimer validations, vues, comments (simplifié)
      this.alertValidations.forEach((v, key) => { if (v.alertId === id) this.alertValidations.delete(key); });
      this.alertViews.forEach((v, key) => { if (v.alertId === id) this.alertViews.delete(key); });
      this.comments.forEach((c, key) => { if (c.alertId === id) this.comments.delete(key); });

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
      updatedAt: now,
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
      // Supprimer comments (simplifié)
      this.libererComments.forEach((c, key) => { if (c.libererId === id) this.libererComments.delete(key); });

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

  // ✅ AJOUTÉ: Implémentations pour CIN Verifications (MemStorage)

  async getAllCinVerifications(options?: { status?: string; userId?: string; limit?: number }): Promise<CinVerification[]> {
    let verifsArray = Array.from(this.cinVerifications.values())
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());

    if (options?.status) {
      verifsArray = verifsArray.filter(verif => verif.status === options.status);
    }

    if (options?.userId) {
      verifsArray = verifsArray.filter(verif => verif.userId === options.userId);
    }

    if (options?.limit) {
      verifsArray = verifsArray.slice(0, options.limit);
    }

    return verifsArray;
  }

  async getCinVerification(id: string): Promise<CinVerification | undefined> {
    return this.cinVerifications.get(id);
  }

  async getCinVerificationByUserId(userId: string): Promise<CinVerification | undefined> {
    for (const verif of this.cinVerifications.values()) {
      if (verif.userId === userId) {
        return verif;
      }
    }
    return undefined;
  }

  async createCinVerification(insertCinVerif: InsertCinVerification): Promise<CinVerification> {
    const id = randomUUID();
    const now = new Date();
    const cinVerif: CinVerification = {
      id,
      userId: insertCinVerif.userId,
      lastName: insertCinVerif.lastName,
      firstName: insertCinVerif.firstName,
      birthDate: new Date(insertCinVerif.birthDate),
      birthPlace: insertCinVerif.birthPlace,
      address: insertCinVerif.address,
      issuePlace: insertCinVerif.issuePlace,
      issueDate: new Date(insertCinVerif.issueDate),
      cinNumber: insertCinVerif.cinNumber,
      cinUploadFrontUrl: insertCinVerif.cinUploadFrontUrl || null,
      cinUploadBackUrl: insertCinVerif.cinUploadBackUrl || null,
      status: insertCinVerif.status || 'pending',
      adminId: insertCinVerif.adminId,
      verifiedAt: insertCinVerif.verifiedAt ? new Date(insertCinVerif.verifiedAt) : null,
      notes: insertCinVerif.notes || '',
      createdAt: now,
      updatedAt: now,
    };

    this.cinVerifications.set(id, cinVerif);
    return cinVerif;
  }

  async updateCinVerification(id: string, updates: Partial<CinVerification>): Promise<CinVerification | undefined> {
    const existing = this.cinVerifications.get(id);
    if (!existing) return undefined;

    // Convertir dates si fournies
    if (updates.birthDate) updates.birthDate = new Date(updates.birthDate as string);
    if (updates.issueDate) updates.issueDate = new Date(updates.issueDate as string);
    if (updates.verifiedAt) updates.verifiedAt = new Date(updates.verifiedAt as string);

    const updatedVerif: CinVerification = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    this.cinVerifications.set(id, updatedVerif);
    return updatedVerif;
  }

  async deleteCinVerification(id: string): Promise<boolean> {
    return this.cinVerifications.delete(id);
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

  private async incrementUserAlertsCount(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.alertsCount = (user.alertsCount || 0) + 1;
      user.updatedAt = new Date();
    }
  }

  private async decrementUserAlertsCount(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.alertsCount = Math.max(0, (user.alertsCount || 0) - 1);
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

export const storage = process.env.DATABASE_URL
  ? new PostgreSQLStorage()
  : new MemStorage();