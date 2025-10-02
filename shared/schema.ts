// schema.ts - Updated with liberer table (simplified, with separate comments table)
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { pgTable, text, integer, boolean, timestamp, decimal, varchar, jsonb, inet, index, uniqueIndex, doublePrecision } from "drizzle-orm/pg-core";

// Modifiez le schéma utilisateur pour inclure le mot de passe et les coordonnées géographiques
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  name: varchar("name").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  email: varchar("email"),
  phone: varchar("phone"),
  password: varchar("password"), // ✅ CHAMP AJOUTÉ
  neighborhood: varchar("neighborhood"),
  latitude: doublePrecision("latitude"), // ✅ CHAMP AJOUTÉ
  longitude: doublePrecision("longitude"), // ✅ CHAMP AJOUTÉ
  avatar: varchar("avatar"),
  profileImageUrl: varchar("profile_image_url"),
  hasCIN: boolean("has_cin").default(false),
  cinUploadedFront: boolean("cin_uploaded_front").default(false),
  cinUploadedBack: boolean("cin_uploaded_back").default(false),
  cinUploadFrontUrl: varchar("cin_upload_front_url"),
  cinUploadBackUrl: varchar("cin_upload_back_url"),
  cinVerified: boolean("cin_verified").default(false),
  cinVerifiedAt: timestamp("cin_verified_at"),
  cinVerifiedBy: varchar("cin_verified_by").references(() => users.id, { onDelete: "set null" }),
  isAdmin: boolean("is_admin").default(false),
  alertsCount: integer("alerts_count").default(0),
  validationsCount: integer("validations_count").default(0),
  joinedAt: timestamp("joined_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpdateUser = Partial<Omit<User, 'id'>>;

export const alerts = pgTable("alerts", {
  id: varchar("id", { length: 50 }).primaryKey().default(sql`gen_random_uuid()`),
  reason: text("reason").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  latitude: doublePrecision("latitude"), // ✅ CORRIGÉ : doublePrecision au lieu de decimal
  longitude: doublePrecision("longitude"), // ✅ CORRIGÉ : doublePrecision au lieu de decimal
  status: text("status").notNull().default("pending"),
  urgency: text("urgency").notNull().default("medium"),
  authorId: varchar("author_id", { length: 50 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  confirmedCount: integer("confirmed_count").default(0),
  rejectedCount: integer("rejected_count").default(0),
  view: integer("view").default(0),
  media: jsonb("media").$type<string[]>().default([]),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("alerts_author_id_idx").on(table.authorId),
  index("alerts_status_idx").on(table.status),
  index("alerts_urgency_idx").on(table.urgency),
  index("alerts_created_at_idx").on(table.createdAt),
  index("alerts_location_idx").on(table.location),
]);

// === TABLE DE VALIDATIONS ===

export const alertValidations = pgTable("alert_validations", {
  id: varchar("id", { length: 50 }).primaryKey().default(sql`gen_random_uuid()`),
  alertId: varchar("alert_id", { length: 50 }).notNull().references(() => alerts.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 50 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  isValid: boolean("is_valid").notNull(), // true = confirmé, false = rejeté
  validatedAt: timestamp("validated_at").defaultNow(),
}, (table) => [
  // Contrainte unique pour éviter les doublons de validation
  uniqueIndex("alert_validations_unique").on(table.alertId, table.userId),
  index("alert_validations_alert_id_idx").on(table.alertId),
  index("alert_validations_user_id_idx").on(table.userId),
  index("alert_validations_is_valid_idx").on(table.isValid),
]);

// === TABLE DES COMMENTAIRES SUR LES ALERTES ===

export const alertComments = pgTable("alert_comments", {
  id: varchar("id", { length: 50 }).primaryKey().default(sql`gen_random_uuid()`),
  alertId: varchar("alert_id", { length: 50 }).notNull().references(() => alerts.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 50 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("alert_comments_alert_id_idx").on(table.alertId),
  index("alert_comments_user_id_idx").on(table.userId),
  index("alert_comments_created_at_idx").on(table.createdAt),
]);

// ✅ AJOUTÉ: TABLE DES VUES D'ALERTES

export const alertViews = pgTable("alert_views", {
  id: varchar("id", { length: 50 }).primaryKey().default(sql`gen_random_uuid()`),
  alertId: varchar("alert_id", { length: 50 }).notNull().references(() => alerts.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 50 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  viewedAt: timestamp("viewed_at").defaultNow(),
}, (table) => [
  // Contrainte unique pour éviter les doublons de vue par utilisateur
  uniqueIndex("alert_views_unique").on(table.alertId, table.userId),
  index("alert_views_alert_id_idx").on(table.alertId),
  index("alert_views_user_id_idx").on(table.userId),
  index("alert_views_viewed_at_idx").on(table.viewedAt),
]);

// ✅ AJOUTÉ: TABLE LIBERER (SOS Liberation) - Simplifiée sans counts, media, urgency, lat/lon ; avec validation boolean, arrestDate, arrestedBy

export const liberer = pgTable("liberer", {
  id: varchar("id", { length: 50 }).primaryKey().default(sql`gen_random_uuid()`),
  personName: text("person_name").notNull(), // Nom de la personne à libérer
  personDescription: text("person_description").notNull(), // Description de la personne (âge, apparence, etc.)
  personImageUrl: varchar("person_image_url").notNull(), // Image de la personne (obligatoire)
  arrestVideoUrl: varchar("arrest_video_url"), // Vidéo d'arrestation (optionnelle)
  arrestDescription: text("arrest_description").notNull(), // Description de l'arrestation et demande de libération
  location: text("location").notNull(), // Lieu de l'arrestation
  status: text("status").notNull().default("pending"),
  validation: boolean("validation").default(false), // ✅ AJOUTÉ: Validation booléenne (true/false)
  arrestDate: timestamp("arrest_date").notNull(), // ✅ AJOUTÉ: Jour de l'arrestation
  arrestedBy: text("arrested_by").notNull(), // ✅ AJOUTÉ: Qui l'a emmené (forces de l'ordre, etc.)
  authorId: varchar("author_id", { length: 50 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  view: integer("view").default(0),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("liberer_author_id_idx").on(table.authorId),
  index("liberer_status_idx").on(table.status),
  index("liberer_created_at_idx").on(table.createdAt),
  index("liberer_location_idx").on(table.location),
  index("liberer_arrest_date_idx").on(table.arrestDate),
]);

// === TABLE DES COMMENTAIRES SUR LES LIBERER === (comme pour les alertes)

export const libererComments = pgTable("liberer_comments", {
  id: varchar("id", { length: 50 }).primaryKey().default(sql`gen_random_uuid()`),
  libererId: varchar("liberer_id", { length: 50 }).notNull().references(() => liberer.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 50 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("liberer_comments_liberer_id_idx").on(table.libererId),
  index("liberer_comments_user_id_idx").on(table.userId),
  index("liberer_comments_created_at_idx").on(table.createdAt),
]);

// === TABLE DES SESSIONS ===

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid", { length: 255 }).primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [
    index("IDX_session_expire").on(table.expire),
    index("sessions_sid_idx").on(table.sid),
  ]
);

// === TABLE DES LOGS D'ACTIVITÉ ===

export const activityLogs = pgTable("activity_logs", {
  id: varchar("id", { length: 50 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 50 }).references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(), // 'alert_created', 'alert_validated', 'user_registered', etc.
  resourceType: text("resource_type"), // 'alert', 'user', 'validation'
  resourceId: varchar("resource_id", { length: 50 }),
  details: jsonb("details").default({}),
  ipAddress: inet("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("activity_logs_user_id_idx").on(table.userId),
  index("activity_logs_action_idx").on(table.action),
  index("activity_logs_created_at_idx").on(table.createdAt),
]);

// === SCHÉMAS DE VALIDATION ZOD ===

export const insertUserSchema = createInsertSchema(users, {
  name: z.string().optional(), // Rendre optionnel car généré automatiquement
  email: z.string().email("Email invalide").optional().or(z.literal('')),
  phone: z.string().min(1, "Le téléphone est requis").regex(/^\+?[\d\s\-\(\)]+$/, "Numéro de téléphone invalide"),
  password: z.string().min(1, "Le mot de passe est requis").min(4, "Le mot de passe doit contenir au moins 4 caractères"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  neighborhood: z.string().optional().default("Non spécifié"),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  cinUploadedFront: z.boolean().optional().default(false),
  cinUploadedBack: z.boolean().optional().default(false),
  cinUploadFrontUrl: z.string().url("URL front CIN invalide").optional().or(z.literal('')),
  cinUploadBackUrl: z.string().url("URL back CIN invalide").optional().or(z.literal('')),
  cinVerified: z.boolean().optional().default(false),
  cinVerifiedAt: z.string().datetime().optional(),
  cinVerifiedBy: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  alertsCount: true,
  validationsCount: true,
  joinedAt: true, // ✅ CORRIGÉ : ajouté car manquant
});

export const upsertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  phone: true,
  neighborhood: true,
  latitude: true,
  longitude: true,
  isAdmin: true,
  cinUploadedFront: true,
  cinUploadedBack: true,
  cinUploadFrontUrl: true,
  cinUploadBackUrl: true,
  cinVerified: true,
  cinVerifiedAt: true,
  cinVerifiedBy: true,
});

export const insertAlertSchema = createInsertSchema(alerts, {
  reason: z.string().min(1, "Le type d'incident est requis"),
  description: z.string().min(1, "La description est requise").max(1000, "La description ne peut pas dépasser 1000 caractères"),
  location: z.string().min(1, "La localisation est requise"),
  urgency: z.enum(['low', 'medium', 'high']).default('medium'),
  media: z.array(z.string().url("URL de média invalide")).default([]),
}).omit({
  id: true,
  status: true,
  confirmedCount: true,
  rejectedCount: true,
  view: true, // ✅ AJOUTÉ: omit view
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  authorId: z.string().min(1, "L'auteur est requis"),
});

// ✅ AJOUTÉ: Schéma pour la mise à jour d'une alerte
export const updateAlertSchema = z.object({
  reason: z.string().min(1).optional(),
  description: z.string().min(1).max(1000).optional(),
  location: z.string().min(1).optional(),
  urgency: z.enum(['low', 'medium', 'high']).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  // media: z.array(z.string().url()).optional(), // Si vous voulez permettre la mise à jour des médias
});

// ✅ AJOUTÉ: Schéma pour l'insertion d'une vue
export const insertAlertViewSchema = createInsertSchema(alertViews, {
  alertId: z.string().min(1),
  userId: z.string().min(1),
}).omit({
  id: true,
  viewedAt: true,
});

export const updateAlertStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'fake', 'resolved']),
});

export const validateAlertSchema = z.object({
  isConfirmed: z.boolean(),
  userId: z.string().min(1, "L'utilisateur est requis"),
});

export const insertAlertValidationSchema = createInsertSchema(alertValidations).omit({
  id: true,
  validatedAt: true,
});

export const insertAlertCommentSchema = createInsertSchema(alertComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ✅ AJOUTÉ: Schémas pour liberer (simplifiés)

export const insertLibererSchema = createInsertSchema(liberer, {
  personName: z.string().min(1, "Le nom de la personne est requis"),
  personDescription: z.string().min(1, "La description de la personne est requise").max(1000, "La description ne peut pas dépasser 1000 caractères"),
  personImageUrl: z.string().url("URL de l'image de la personne invalide"),
  arrestVideoUrl: z.string().url("URL de la vidéo d'arrestation invalide").optional(),
  arrestDescription: z.string().min(1, "La description de l'arrestation est requise").max(1000, "La description ne peut pas dépasser 1000 caractères"),
  location: z.string().min(1, "La localisation est requise"),
  validation: z.boolean().default(false),
  arrestDate: z.string().datetime("Date d'arrestation invalide"),
  arrestedBy: z.string().min(1, "Qui a emmené la personne est requis"),
}).omit({
  id: true,
  status: true,
  view: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  authorId: z.string().min(1, "L'auteur est requis"),
});

// ✅ AJOUTÉ: Schéma pour la mise à jour d'un liberer
export const updateLibererSchema = z.object({
  personName: z.string().min(1).optional(),
  personDescription: z.string().min(1).max(1000).optional(),
  personImageUrl: z.string().url().optional(),
  arrestVideoUrl: z.string().url().optional(),
  arrestDescription: z.string().min(1).max(1000).optional(),
  location: z.string().min(1).optional(),
  validation: z.boolean().optional(),
  arrestDate: z.string().datetime().optional(),
  arrestedBy: z.string().min(1).optional(),
});

export const updateLibererStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'fake', 'resolved']),
});

export const insertLibererCommentSchema = createInsertSchema(libererComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const activityLogSchema = z.object({
  userId: z.string().optional(),
  action: z.string().min(1, "L'action est requise"),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  details: z.record(z.any()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

// === TYPES TypeScript ===

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;
export type AlertValidation = typeof alertValidations.$inferSelect;
export type InsertAlertValidation = z.infer<typeof insertAlertValidationSchema>;
export type AlertComment = typeof alertComments.$inferSelect;
export type InsertAlertComment = z.infer<typeof insertAlertCommentSchema>;
export type AlertView = typeof alertViews.$inferSelect;
export type InsertAlertView = z.infer<typeof insertAlertViewSchema>;
export type Liberer = typeof liberer.$inferSelect;
export type InsertLiberer = z.infer<typeof insertLibererSchema>;
export type LibererComment = typeof libererComments.$inferSelect;
export type InsertLibererComment = z.infer<typeof insertLibererCommentSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;
export type Session = typeof sessions.$inferSelect;

// === TYPES POUR LES STATISTIQUES ===

export type UserStats = {
  alertsCount: number;
  validationsCount: number;
  confirmedAlertsCount: number;
  fakeAlertsCount: number;
};

export type SystemStats = {
  usersCount: number;
  alertsCount: number;
  confirmedAlertsCount: number;
  pendingAlertsCount: number;
  resolvedAlertsCount: number;
  validationsCount: number;
};

// === FONCTIONS UTILITAIRES ===

// Fonction pour les contraintes de géolocalisation
export const locationSchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

// Fonction pour valider les URLs des médias
export const mediaUrlSchema = z.string().url("URL de média invalide");