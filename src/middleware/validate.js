const { z } = require('zod');

// Turns a Zod schema into express middleware that replaces req.body with the
// parsed value, so controllers can trust what they receive.
const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const issue = result.error.issues[0];
    return res.status(400).json({
      message: issue ? `${issue.path.join('.') || 'body'}: ${issue.message}` : 'Invalid request body',
    });
  }
  req.body = result.data;
  next();
};

const email = z.string().trim().toLowerCase().email('must be a valid email').max(255);
const password = z
  .string()
  .min(8, 'must be at least 8 characters')
  .max(128, 'must be at most 128 characters');
const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD')
  .refine((v) => !Number.isNaN(Date.parse(v)), 'must be a real date');

const priority = z.number().int().min(0).max(3);
const tagList = z.array(z.string().trim().min(1).max(40)).max(10);
const clockTime = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'must be HH:MM');

const schemas = {
  register: z.object({
    name: z.string().trim().min(1, 'is required').max(120),
    email,
    password,
  }),
  login: z.object({
    email,
    password: z.string().min(1, 'is required').max(128),
  }),
  createTodo: z.object({
    task: z.string().trim().min(1, 'is required').max(500),
    date: dateKey.optional().nullable(),
    completed: z.boolean().optional(),
    priority: priority.optional(),
    tags: tagList.optional(),
    notes: z.string().max(5000).optional().nullable(),
    dueTime: clockTime.optional().nullable(),
  }),
  updateTodo: z
    .object({
      task: z.string().trim().min(1, 'is required').max(500).optional(),
      completed: z.boolean().optional(),
      date: dateKey.optional().nullable(),
      priority: priority.optional(),
      tags: tagList.optional(),
      notes: z.string().max(5000).optional().nullable(),
      dueTime: clockTime.optional().nullable(),
      position: z.number().int().min(0).max(100000).optional(),
    })
    .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' }),
  reorder: z.object({
    order: z
      .array(z.object({ id: z.number().int().positive(), position: z.number().int().min(0) }))
      .min(1)
      .max(500),
  }),
  rollover: z.object({ to: dateKey }),
  updateProfile: z.object({
    name: z.string().trim().min(1, 'is required').max(120),
  }),
  changePassword: z.object({
    currentPassword: z.string().min(1, 'is required').max(128),
    newPassword: password,
  }),
  createSession: z.object({
    id: z.string().min(1).max(200),
    mode: z.enum(['stopwatch', 'pomodoro', 'countdown']),
    date: dateKey,
    startTime: z.number().int().positive(),
    endTime: z.number().int().positive(),
    actualFocusTime: z.number().int().min(0).max(86400000),
    totalPauseTime: z.number().int().min(0).max(86400000).optional(),
    wasCompleted: z.boolean().optional(),
    completedFocusSession: z.number().int().min(0).optional(),
    completedBreaks: z.number().int().min(0).optional(),
    label: z.string().trim().max(200).optional().nullable(),
  }),
  updateSettings: z
    .object({
      theme: z.string().max(60).optional(),
      dailyGoalMs: z.number().int().min(0).max(86400000).optional(),
      pomodoro: z
        .object({
          focus: z.number().int().min(60000).max(14400000),
          break: z.number().int().min(60000).max(7200000),
          longBreak: z.number().int().min(60000).max(7200000),
          cyclesUntilLongBreak: z.number().int().min(2).max(12),
        })
        .partial()
        .optional(),
      notifications: z.object({ sound: z.boolean(), desktop: z.boolean() }).partial().optional(),
      ambientMix: z
        .object({ active: z.array(z.string().max(60)).max(40), volumes: z.record(z.string(), z.number().min(0).max(100)) })
        .partial()
        .optional(),
      lastChannel: z.string().url().max(500).optional(),
      playerVolume: z.number().min(0).max(100).optional(),
      lastWallpaperId: z.string().max(200).optional(),
      worldClockLocations: z.array(z.unknown()).max(12).optional(),
    })
    .refine((v) => Object.keys(v).length > 0, { message: 'No settings to update' }),
  createJournal: z.object({
    title: z.string().trim().min(1, 'is required').max(200),
    content: z.string().max(200000).default(''),
  }),
  updateJournal: z
    .object({
      title: z.string().trim().min(1, 'is required').max(200).optional(),
      content: z.string().max(200000).optional(),
    })
    .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' }),
};

const idParam = (req, res, next) => {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ message: 'Invalid id' });
  }
  next();
};

module.exports = { validateBody, schemas, idParam };
