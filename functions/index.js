const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const express = require('express');
const functions = require('firebase-functions');
const jwt = require('jsonwebtoken');

admin.initializeApp();

const db = admin.firestore();
const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'lasustech_lms_secret_key_2026_change_in_production';
const BOOTSTRAP_ADMIN_KEY = process.env.BOOTSTRAP_ADMIN_KEY || '';
const INVITE_EXPIRY_DAYS = Number(process.env.INVITE_EXPIRY_DAYS || 7);
const MAX_BOOKS_PER_STUDENT = Number(process.env.MAX_BOOKS_PER_STUDENT || 5);
const LOAN_PERIOD_DAYS = Number(process.env.LOAN_PERIOD_DAYS || 14);
const FINE_RATE_PER_DAY = Number(process.env.FINE_RATE_PER_DAY || 100);

app.use('/api', (req, res, next) => {
  res.set('Content-Type', 'application/json; charset=utf-8');
  next();
});

const router = express.Router();
app.use('/api', router);

function nowIso() {
  return new Date().toISOString();
}

function addDaysIso(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function normalizeId(id) {
  if (id === null || id === undefined) return id;
  const numeric = Number(id);
  return Number.isNaN(numeric) ? String(id) : numeric;
}

function toRecord(doc) {
  if (!doc.exists) return null;
  return { id: normalizeId(doc.id), ...doc.data() };
}

async function loadCollection(name) {
  const snapshot = await db.collection(name).get();
  return snapshot.docs.map(toRecord);
}

async function getRecord(name, id) {
  const doc = await db.collection(name).doc(String(id)).get();
  return toRecord(doc);
}

async function saveRecord(name, id, payload) {
  const data = { ...payload, id: normalizeId(id) };
  await db.collection(name).doc(String(id)).set(data, { merge: false });
  return data;
}

async function updateRecord(name, id, payload) {
  const existing = await getRecord(name, id);
  if (!existing) return null;
  const data = { ...payload, updated_at: nowIso() };
  await db.collection(name).doc(String(id)).set(data, { merge: true });
  return { ...existing, ...data, id: normalizeId(id) };
}

async function deleteRecord(name, id) {
  await db.collection(name).doc(String(id)).delete();
}

async function allocateId(collectionName) {
  const counterRef = db.collection('_meta').doc('counters');
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists ? Number(snap.data()?.[collectionName] || 0) : 0;
    const nextId = current + 1;
    tx.set(counterRef, { [collectionName]: nextId }, { merge: true });
    return nextId;
  });
}

function send(res, status, payload) {
  return res.status(status).json(payload);
}

function jsonError(res, message, status = 400) {
  return send(res, status, { error: message });
}

function success(res, message, data = null, status = 200) {
  const payload = { message };
  if (data !== null && data !== undefined) {
    payload.data = data;
  }
  return send(res, status, payload);
}

function paginated(res, data, total, page, perPage) {
  return send(res, 200, {
    data,
    pagination: {
      total,
      page,
      per_page: perPage,
      total_pages: total > 0 ? Math.ceil(total / perPage) : 1,
    },
  });
}

function signToken(user) {
  return jwt.sign(
    {
      user_id: normalizeId(user.id),
      email: user.email,
      role: user.role,
      name: user.full_name,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

async function requireAuth(req, res, allowedRoles = []) {
  const header = req.get('authorization') || req.get('Authorization') || '';
  if (!header.startsWith('Bearer ')) {
    jsonError(res, 'Authentication required', 401);
    return null;
  }

  const token = header.slice(7);
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    jsonError(res, 'Authentication required', 401);
    return null;
  }

  const user = await getRecord('users', decoded.user_id);
  if (!user) {
    jsonError(res, 'User not found', 404);
    return null;
  }

  const { password_hash, ...safeUser } = user;
  const authenticatedUser = safeUser;

  if (authenticatedUser.status !== 'active') {
    jsonError(res, 'Account is suspended or inactive', 403);
    return null;
  }

  if (allowedRoles.length && !allowedRoles.includes(authenticatedUser.role)) {
    jsonError(res, 'Insufficient permissions', 403);
    return null;
  }

  return authenticatedUser;
}

function daysOverdueFromDueDate(dueDateIso) {
  const dueDate = new Date(dueDateIso);
  const diffMs = Date.now() - dueDate.getTime();
  return diffMs > 0 ? Math.ceil(diffMs / (24 * 60 * 60 * 1000)) : 0;
}

function transactionStatus(tx) {
  if (tx.return_date) return tx.status || 'returned';
  if (tx.status === 'checked_out' && new Date(tx.due_date).getTime() < Date.now()) return 'overdue';
  return tx.status || 'checked_out';
}

async function buildBookRecord(book, categoriesById) {
  return {
    ...book,
    category_name: book.category_id ? (categoriesById.get(String(book.category_id))?.name || null) : null,
  };
}

async function buildTransactionRecord(tx, usersById, booksById) {
  const status = transactionStatus(tx);
  return {
    ...tx,
    status,
    student_name: usersById.get(String(tx.user_id))?.full_name || null,
    matric_number: usersById.get(String(tx.user_id))?.matric_number || null,
    book_title: booksById.get(String(tx.book_id))?.title || null,
    book_author: booksById.get(String(tx.book_id))?.author || null,
    isbn: booksById.get(String(tx.book_id))?.isbn || null,
    librarian_name: tx.librarian_id ? (usersById.get(String(tx.librarian_id))?.full_name || null) : null,
    days_remaining: tx.return_date ? 0 : Math.floor((new Date(tx.due_date).getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
    days_overdue: tx.return_date ? 0 : daysOverdueFromDueDate(tx.due_date),
  };
}

async function buildFineRecord(fine, usersById, booksById, transactionsById) {
  const tx = transactionsById.get(String(fine.transaction_id));
  return {
    ...fine,
    student_name: usersById.get(String(fine.user_id))?.full_name || null,
    matric_number: usersById.get(String(fine.user_id))?.matric_number || null,
    book_title: tx ? (booksById.get(String(tx.book_id))?.title || null) : null,
  };
}

async function loadLookups() {
  const [users, books, categories, transactions] = await Promise.all([
    loadCollection('users'),
    loadCollection('books'),
    loadCollection('categories'),
    loadCollection('transactions'),
  ]);

  return {
    users,
    books,
    categories,
    transactions,
    usersById: new Map(users.map((item) => [String(item.id), item])),
    booksById: new Map(books.map((item) => [String(item.id), item])),
    categoriesById: new Map(categories.map((item) => [String(item.id), item])),
    transactionsById: new Map(transactions.map((item) => [String(item.id), item])),
  };
}

async function sendBooksResponse(req, res, searchTerm = '') {
  const page = Math.max(1, Number(req.query.page || 1));
  const perPage = Math.min(50, Math.max(1, Number(req.query.per_page || 12)));
  const categoryId = req.query.category_id ? String(req.query.category_id) : '';
  const department = req.query.department ? String(req.query.department) : '';
  const available = String(req.query.available || '');
  const normalizedSearch = String(searchTerm || '').trim().toLowerCase();

  const [books, categories] = await Promise.all([loadCollection('books'), loadCollection('categories')]);
  const categoriesById = new Map(categories.map((category) => [String(category.id), category]));

  let filtered = books.filter((book) => book.status === 'active');
  if (categoryId) filtered = filtered.filter((book) => String(book.category_id) === categoryId);
  if (department) filtered = filtered.filter((book) => String(book.department || '') === department);
  if (available !== '') {
    filtered = filtered.filter((book) => (available === '1' || available === 'true') ? Number(book.available_copies || 0) > 0 : Number(book.available_copies || 0) === 0);
  }

  if (normalizedSearch) {
    filtered = filtered
      .map((book) => {
        const haystack = [book.title, book.author, book.description, book.isbn, book.call_number].filter(Boolean).join(' ').toLowerCase();
        const score = haystack.includes(normalizedSearch) ? 1 + haystack.split(normalizedSearch).length : 0;
        return { book, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || String(a.book.title || '').localeCompare(String(b.book.title || '')))
      .map((item) => item.book);
  } else {
    filtered = filtered.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
  }

  const mapped = [];
  for (const book of filtered) {
    mapped.push(await buildBookRecord(book, categoriesById));
  }

  const total = mapped.length;
  return paginated(res, mapped.slice((page - 1) * perPage, (page - 1) * perPage + perPage), total, page, perPage);
}

async function findUserByEmail(email) {
  const users = await loadCollection('users');
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase()) || null;
}

async function findActiveInviteByCode(code) {
  const invites = await loadCollection('invites');
  const invite = invites.find((item) => item.code === code) || null;
  if (!invite) {
    return null;
  }
  if (invite.used_at) {
    throw new Error('Invite code has already been used');
  }
  if (invite.revoked_at) {
    throw new Error('Invite code has been revoked');
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    throw new Error('Invite code has expired');
  }
  return invite;
}

router.get('/auth/bootstrap-status', async (req, res) => {
  const users = await loadCollection('users');
  const adminCount = users.filter((user) => user.role === 'admin').length;
  return send(res, 200, {
    available: adminCount === 0,
    admin_count: adminCount,
    message: adminCount === 0 ? 'Bootstrap admin is available' : 'An administrator already exists. Use sign in instead.',
  });
});

router.post('/auth/login', async (req, res) => {
  const { email = '', password = '' } = req.body || {};
  if (!email || !password) return jsonError(res, 'Email and password are required');

  const user = await findUserByEmail(email.trim());
  if (!user || !(await bcrypt.compare(password, user.password_hash || ''))) {
    return jsonError(res, 'Invalid email or password', 401);
  }

  if (user.status !== 'active') {
    return jsonError(res, 'Account is suspended or inactive', 403);
  }

  const { password_hash, ...safeUser } = user;
  return send(res, 200, {
    message: 'Login successful',
    token: signToken(user),
    user: safeUser,
  });
});

router.post('/auth/register', async (req, res) => {
  const { email = '', password = '', full_name = '', matric_number = '', department = '', phone = '', invite_code = '' } = req.body || {};
  if (!email || !password || !full_name) return jsonError(res, 'Email, password, and full name are required');
  if (String(password).length < 6) return jsonError(res, 'Password must be at least 6 characters');

  let role = 'student';
  let invite = null;
  if (invite_code) {
    try {
      invite = await findActiveInviteByCode(String(invite_code).trim());
    } catch (error) {
      return jsonError(res, error.message, 409);
    }
    if (!invite) return jsonError(res, 'Invalid invite code', 404);
    role = invite.role;
  }

  const existing = await findUserByEmail(email.trim());
  if (existing) return jsonError(res, 'Email already registered', 409);

  const id = await allocateId('users');
  const user = {
    id,
    email: email.trim(),
    password_hash: await bcrypt.hash(String(password), 10),
    full_name: full_name.trim(),
    matric_number: matric_number ? String(matric_number).trim() : null,
    role,
    department: department ? String(department).trim() : null,
    phone: phone ? String(phone).trim() : null,
    avatar_url: null,
    status: 'active',
    max_books: MAX_BOOKS_PER_STUDENT,
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  await saveRecord('users', id, user);

  if (invite) {
    await updateRecord('invites', invite.id, { used_at: nowIso() });
  }

  const { password_hash, ...safeUser } = user;
  return send(res, 201, {
    message: 'Registration successful',
    token: signToken(user),
    user: safeUser,
  });
});

router.post('/auth/bootstrap-admin', async (req, res) => {
  const users = await loadCollection('users');
  if (users.some((user) => user.role === 'admin')) {
    return jsonError(res, 'Bootstrap admin is only available before the first admin account exists', 409);
  }

  const { bootstrap_key = '', email = '', password = '', full_name = '', department = 'Library Services', phone = '' } = req.body || {};
  if (!BOOTSTRAP_ADMIN_KEY) return jsonError(res, 'Bootstrap admin is not configured', 500);
  if (!bootstrap_key || bootstrap_key !== BOOTSTRAP_ADMIN_KEY) return jsonError(res, 'Invalid bootstrap key', 403);
  if (!email || !password || !full_name) return jsonError(res, 'Email, password, and full name are required');
  if (String(password).length < 6) return jsonError(res, 'Password must be at least 6 characters');

  const existing = await findUserByEmail(email.trim());
  if (existing) return jsonError(res, 'Email already registered', 409);

  const id = await allocateId('users');
  const user = {
    id,
    email: email.trim(),
    password_hash: await bcrypt.hash(String(password), 10),
    full_name: full_name.trim(),
    matric_number: null,
    role: 'admin',
    department: department ? String(department).trim() : null,
    phone: phone ? String(phone).trim() : null,
    avatar_url: null,
    status: 'active',
    max_books: MAX_BOOKS_PER_STUDENT,
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  await saveRecord('users', id, user);
  const { password_hash, ...safeUser } = user;
  return send(res, 201, {
    message: 'Bootstrap admin created successfully',
    token: signToken(user),
    user: safeUser,
  });
});

router.post('/auth/invite', async (req, res) => {
  const authUser = await requireAuth(req, res, ['admin']);
  if (!authUser) return;

  const role = ['admin', 'librarian', 'student'].includes(req.body?.role) ? req.body.role : 'librarian';
  const expiresInDays = Math.max(1, Number(req.body?.expires_in_days || INVITE_EXPIRY_DAYS));
  const code = `${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}`.toUpperCase();
  const id = await allocateId('invites');

  const invite = {
    id,
    code,
    role,
    created_by: authUser.id,
    expires_at: addDaysIso(expiresInDays),
    used_at: null,
    revoked_at: null,
    created_at: nowIso(),
  };

  await saveRecord('invites', id, invite);
  return send(res, 201, {
    message: 'Invite created successfully',
    invite: { id: invite.id, code: invite.code, role: invite.role, expires_at: invite.expires_at },
  });
});

router.get('/auth/invites', async (req, res) => {
  const authUser = await requireAuth(req, res, ['admin']);
  if (!authUser) return;

  const [invites, users] = await Promise.all([loadCollection('invites'), loadCollection('users')]);
  const usersById = new Map(users.map((user) => [String(user.id), user]));
  const enriched = invites
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    .map((invite) => ({
      ...invite,
      created_by_name: invite.created_by ? (usersById.get(String(invite.created_by))?.full_name || null) : null,
      status: invite.used_at
        ? 'used'
        : invite.revoked_at
          ? 'revoked'
          : new Date(invite.expires_at).getTime() < Date.now()
            ? 'expired'
            : 'active',
    }));

  return send(res, 200, { invites: enriched });
});

router.put('/auth/invites/:id', async (req, res) => {
  const authUser = await requireAuth(req, res, ['admin']);
  if (!authUser) return;

  const id = req.params.id;
  const invite = await getRecord('invites', id);
  if (!invite) return jsonError(res, 'Invite not found', 404);
  if (invite.used_at) return jsonError(res, 'Used invites cannot be modified', 409);

  const status = String(req.body?.status || '').toLowerCase();
  if (!['revoked', 'expired'].includes(status)) return jsonError(res, 'Valid status is required');

  const patch = status === 'revoked' ? { revoked_at: nowIso() } : { expires_at: nowIso(), revoked_at: null };
  await updateRecord('invites', id, patch);
  const updated = await getRecord('invites', id);
  return success(res, 'Invite updated successfully', {
    invite: {
      ...updated,
      created_by_name: authUser.full_name,
      status,
    },
  });
});

router.get('/auth/me', async (req, res) => {
  const authUser = await requireAuth(req, res);
  if (!authUser) return;

  const [transactions, fines] = await Promise.all([loadCollection('transactions'), loadCollection('fines')]);
  const user = { ...authUser };

  if (user.role === 'student') {
    user.active_borrows = transactions.filter((tx) => String(tx.user_id) === String(user.id) && ['checked_out', 'overdue'].includes(transactionStatus(tx))).length;
    user.outstanding_fines = fines
      .filter((fine) => String(fine.user_id) === String(user.id) && fine.status === 'pending')
      .reduce((sum, fine) => sum + Number(fine.amount || 0), 0);
  }

  return send(res, 200, { user });
});

router.get('/books', async (req, res) => {
  return sendBooksResponse(req, res);
});

router.get('/books/search', async (req, res) => {
  return sendBooksResponse(req, res, req.query.q || '');
});

router.get('/books/:id', async (req, res) => {
  const [book, transactions, categories] = await Promise.all([
    getRecord('books', req.params.id),
    loadCollection('transactions'),
    loadCollection('categories'),
  ]);
  if (!book) return jsonError(res, 'Book not found', 404);
  const categoriesById = new Map(categories.map((category) => [String(category.id), category]));
  const recentTransactions = transactions
    .filter((tx) => String(tx.book_id) === String(book.id))
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    .slice(0, 5)
    .map((tx) => ({
      checkout_date: tx.checkout_date,
      due_date: tx.due_date,
      return_date: tx.return_date,
      status: transactionStatus(tx),
    }));
  return send(res, 200, { book: { ...book, category_name: book.category_id ? (categoriesById.get(String(book.category_id))?.name || null) : null, recent_transactions: recentTransactions } });
});

router.post('/books', async (req, res) => {
  const authUser = await requireAuth(req, res, ['admin', 'librarian']);
  if (!authUser) return;
  const { title = '', author = '' } = req.body || {};
  if (!String(title).trim()) return jsonError(res, 'title is required');
  if (!String(author).trim()) return jsonError(res, 'author is required');

  const categoryId = req.body?.category_id !== undefined && req.body?.category_id !== null && req.body?.category_id !== '' ? Number(req.body.category_id) : null;
  if (categoryId !== null && Number.isNaN(categoryId)) return jsonError(res, 'Valid category is required');
  if (categoryId !== null) {
    const category = await getRecord('categories', categoryId);
    if (!category) return jsonError(res, 'Category not found', 404);
  }

  const id = await allocateId('books');
  const totalCopies = Math.max(1, Number(req.body?.total_copies || 1));
  const book = {
    id,
    title: String(title).trim(),
    author: String(author).trim(),
    isbn: req.body?.isbn ? String(req.body.isbn).trim() : null,
    publisher: req.body?.publisher ? String(req.body.publisher).trim() : null,
    edition: req.body?.edition ? String(req.body.edition).trim() : null,
    publish_year: req.body?.publish_year || null,
    category_id: categoryId,
    department: req.body?.department ? String(req.body.department).trim() : null,
    description: req.body?.description ? String(req.body.description).trim() : null,
    cover_image: req.body?.cover_image ? String(req.body.cover_image).trim() : null,
    call_number: req.body?.call_number ? String(req.body.call_number).trim() : null,
    total_copies: totalCopies,
    available_copies: totalCopies,
    pages: req.body?.pages || null,
    language: req.body?.language ? String(req.body.language).trim() : 'English',
    status: 'active',
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  await saveRecord('books', id, book);
  return success(res, 'Book added successfully', { id }, 201);
});

router.put('/books/:id', async (req, res) => {
  const authUser = await requireAuth(req, res, ['admin', 'librarian']);
  if (!authUser) return;
  const book = await getRecord('books', req.params.id);
  if (!book) return jsonError(res, 'Book not found', 404);

  const allowedFields = ['title', 'author', 'isbn', 'publisher', 'edition', 'publish_year', 'category_id', 'department', 'description', 'cover_image', 'call_number', 'total_copies', 'pages', 'language', 'status'];
  const patch = { updated_at: nowIso() };
  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(req.body || {}, field)) {
      patch[field] = req.body[field];
    }
  }

  await updateRecord('books', req.params.id, patch);
  return success(res, 'Book updated successfully');
});

router.delete('/books/:id', async (req, res) => {
  const authUser = await requireAuth(req, res, ['admin']);
  if (!authUser) return;
  const transactions = await loadCollection('transactions');
  if (transactions.some((tx) => String(tx.book_id) === String(req.params.id) && ['checked_out', 'overdue'].includes(transactionStatus(tx)))) {
    return jsonError(res, 'Cannot delete book with active transactions', 409);
  }
  await updateRecord('books', req.params.id, { status: 'archived', updated_at: nowIso() });
  return success(res, 'Book archived successfully');
});

router.get('/categories', async (req, res) => {
  const [categories, books] = await Promise.all([loadCollection('categories'), loadCollection('books')]);
  const enriched = categories
    .map((category) => ({
      ...category,
      book_count: books.filter((book) => String(book.category_id) === String(category.id) && book.status === 'active').length,
    }))
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  return send(res, 200, { categories: enriched });
});

router.get('/categories/:id', async (req, res) => {
  const category = await getRecord('categories', req.params.id);
  if (!category) return jsonError(res, 'Category not found', 404);
  return send(res, 200, { category });
});

router.post('/categories', async (req, res) => {
  const authUser = await requireAuth(req, res, ['admin']);
  if (!authUser) return;
  const name = String(req.body?.name || '').trim();
  if (!name) return jsonError(res, 'Category name is required');
  const id = await allocateId('categories');
  const category = { id, name, description: req.body?.description ? String(req.body.description).trim() : null, icon: req.body?.icon ? String(req.body.icon).trim() : null, created_at: nowIso() };
  await saveRecord('categories', id, category);
  return success(res, 'Category created', { id }, 201);
});

router.put('/categories/:id', async (req, res) => {
  const authUser = await requireAuth(req, res, ['admin']);
  if (!authUser) return;
  const category = await getRecord('categories', req.params.id);
  if (!category) return jsonError(res, 'Category not found', 404);
  const name = String(req.body?.name || '').trim();
  if (!name) return jsonError(res, 'Category name is required');
  await updateRecord('categories', req.params.id, { name, description: req.body?.description ? String(req.body.description).trim() : null, icon: req.body?.icon ? String(req.body.icon).trim() : null, updated_at: nowIso() });
  return success(res, 'Category updated', { id: normalizeId(req.params.id) });
});

router.get('/transactions', async (req, res) => {
  const authUser = await requireAuth(req, res, ['admin', 'librarian']);
  if (!authUser) return;
  const page = Math.max(1, Number(req.query.page || 1));
  const perPage = Math.min(50, Math.max(1, Number(req.query.per_page || 20)));
  const status = String(req.query.status || '').trim();
  const userId = req.query.user_id ? String(req.query.user_id) : '';
  const lookups = await loadLookups();
  let txs = lookups.transactions;
  if (status) txs = txs.filter((tx) => transactionStatus(tx) === status);
  if (userId) txs = txs.filter((tx) => String(tx.user_id) === userId);
  txs = txs.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  const mapped = [];
  for (const tx of txs) mapped.push(await buildTransactionRecord(tx, lookups.usersById, lookups.booksById));
  return paginated(res, mapped.slice((page - 1) * perPage, (page - 1) * perPage + perPage), mapped.length, page, perPage);
});

router.get('/transactions/my', async (req, res) => {
  const authUser = await requireAuth(req, res);
  if (!authUser) return;
  const status = String(req.query.status || '').trim();
  const lookups = await loadLookups();
  let txs = lookups.transactions.filter((tx) => String(tx.user_id) === String(authUser.id));
  if (status) txs = txs.filter((tx) => transactionStatus(tx) === status);
  txs = txs.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  const mapped = [];
  for (const tx of txs) mapped.push(await buildTransactionRecord(tx, lookups.usersById, lookups.booksById));
  return send(res, 200, { transactions: mapped });
});

router.get('/transactions/:id', async (req, res) => {
  const authUser = await requireAuth(req, res);
  if (!authUser) return;
  const lookups = await loadLookups();
  const tx = lookups.transactionsById.get(String(req.params.id));
  if (!tx) return jsonError(res, 'Transaction not found', 404);
  return send(res, 200, { transaction: await buildTransactionRecord(tx, lookups.usersById, lookups.booksById) });
});

router.post('/transactions/checkout', async (req, res) => {
  const authUser = await requireAuth(req, res);
  if (!authUser) return;

  let userId = Number(req.body?.user_id || 0);
  const bookId = Number(req.body?.book_id || 0);
  const loanDays = Number(req.body?.loan_days || LOAN_PERIOD_DAYS);
  if (authUser.role === 'student') userId = Number(authUser.id);
  if (!bookId) return jsonError(res, 'Book ID is required');
  if (authUser.role !== 'student' && !userId) return jsonError(res, 'User ID and Book ID are required');
  if (authUser.role === 'student' && userId !== Number(authUser.id)) return jsonError(res, 'Students can only check out books for their own account', 403);

  const [student, book, fines, transactions] = await Promise.all([
    getRecord('users', userId),
    getRecord('books', bookId),
    loadCollection('fines'),
    loadCollection('transactions'),
  ]);

  if (!student || student.status !== 'active') return jsonError(res, 'Student not found or inactive', 404);
  if (!book || book.status !== 'active') return jsonError(res, 'Book not found or not available', 404);

  const outstandingFines = fines.filter((fine) => String(fine.user_id) === String(userId) && fine.status === 'pending').reduce((sum, fine) => sum + Number(fine.amount || 0), 0);
  if (outstandingFines > 0) return jsonError(res, `Student has outstanding fines of ₦${outstandingFines.toFixed(2)}. Fines must be cleared before borrowing.`, 409);

  const activeBorrows = transactions.filter((tx) => String(tx.user_id) === String(userId) && ['checked_out', 'overdue'].includes(transactionStatus(tx))).length;
  const maxBooks = Number(student.max_books || MAX_BOOKS_PER_STUDENT);
  if (activeBorrows >= maxBooks) return jsonError(res, `Student has reached maximum borrow limit of ${maxBooks} books`, 409);

  if (Number(book.available_copies || 0) <= 0) return jsonError(res, 'No copies of this book are currently available', 409);
  if (transactions.some((tx) => String(tx.user_id) === String(userId) && String(tx.book_id) === String(bookId) && ['checked_out', 'overdue'].includes(transactionStatus(tx)))) {
    return jsonError(res, 'Student already has this book checked out', 409);
  }

  const transactionId = await allocateId('transactions');
  const dueDate = addDaysIso(loanDays);
  const transaction = {
    id: transactionId,
    user_id: userId,
    book_id: bookId,
    checkout_date: nowIso(),
    due_date: dueDate,
    return_date: null,
    status: 'checked_out',
    librarian_id: authUser.role === 'student' ? null : authUser.id,
    notes: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  await saveRecord('transactions', transactionId, transaction);
  await updateRecord('books', bookId, { available_copies: Math.max(0, Number(book.available_copies || 0) - 1), updated_at: nowIso() });

  const activityId = await allocateId('activity_log');
  await saveRecord('activity_log', activityId, { id: activityId, user_id: authUser.id, action: 'checkout', entity_type: 'transaction', entity_id: transactionId, details: { book: book.title, student_id: userId }, ip_address: req.ip || null, created_at: nowIso() });

  return success(res, 'Book checked out successfully', { transaction_id: transactionId, due_date: dueDate }, 201);
});

router.post('/transactions/return', async (req, res) => {
  const authUser = await requireAuth(req, res, ['admin', 'librarian']);
  if (!authUser) return;
  const transactionId = Number(req.body?.transaction_id || 0);
  if (!transactionId) return jsonError(res, 'Transaction ID is required');

  const transaction = await getRecord('transactions', transactionId);
  if (!transaction || !['checked_out', 'overdue'].includes(transactionStatus(transaction))) return jsonError(res, 'Active transaction not found', 404);

  const txnBook = await getRecord('books', transaction.book_id);
  if (!txnBook) return jsonError(res, 'Book not found', 404);

  await updateRecord('transactions', transactionId, { status: 'returned', return_date: nowIso(), updated_at: nowIso() });
  await updateRecord('books', transaction.book_id, { available_copies: Number(txnBook.available_copies || 0) + 1, updated_at: nowIso() });

  const daysOverdue = daysOverdueFromDueDate(transaction.due_date);
  if (daysOverdue > 0) {
    const fineId = await allocateId('fines');
    await saveRecord('fines', fineId, {
      id: fineId,
      transaction_id: transactionId,
      user_id: transaction.user_id,
      amount: Number((daysOverdue * FINE_RATE_PER_DAY).toFixed(2)),
      daily_rate: FINE_RATE_PER_DAY,
      days_overdue: daysOverdue,
      status: 'pending',
      calculated_date: nowIso(),
      paid_date: null,
      created_at: nowIso(),
    });
  }

  const activityId = await allocateId('activity_log');
  await saveRecord('activity_log', activityId, { id: activityId, user_id: authUser.id, action: 'return', entity_type: 'transaction', entity_id: transactionId, details: { book_id: transaction.book_id }, ip_address: req.ip || null, created_at: nowIso() });

  return success(res, 'Book returned successfully');
});

router.get('/fines', async (req, res) => {
  const authUser = await requireAuth(req, res, ['admin', 'librarian']);
  if (!authUser) return;
  const page = Math.max(1, Number(req.query.page || 1));
  const perPage = Math.min(50, Math.max(1, Number(req.query.per_page || 20)));
  const status = String(req.query.status || '').trim();
  const lookups = await loadLookups();
  let fines = await loadCollection('fines');
  if (status) fines = fines.filter((fine) => fine.status === status);
  fines = fines.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  const mapped = [];
  for (const fine of fines) mapped.push(await buildFineRecord(fine, lookups.usersById, lookups.booksById, lookups.transactionsById));
  return paginated(res, mapped.slice((page - 1) * perPage, (page - 1) * perPage + perPage), mapped.length, page, perPage);
});

router.get('/fines/my', async (req, res) => {
  const authUser = await requireAuth(req, res);
  if (!authUser) return;
  const [fines, lookups] = await Promise.all([loadCollection('fines'), loadLookups()]);
  const filtered = fines.filter((fine) => String(fine.user_id) === String(authUser.id));
  const mapped = [];
  for (const fine of filtered.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))) mapped.push(await buildFineRecord(fine, lookups.usersById, lookups.booksById, lookups.transactionsById));
  const totalPending = mapped.reduce((sum, fine) => sum + (fine.status === 'pending' ? Number(fine.amount || 0) : 0), 0);
  const totalPaid = mapped.reduce((sum, fine) => sum + (fine.status === 'paid' ? Number(fine.amount || 0) : 0), 0);
  return send(res, 200, { fines: mapped, summary: { total_pending: totalPending, total_paid: totalPaid } });
});

router.post('/fines/pay', async (req, res) => {
  const authUser = await requireAuth(req, res, ['admin', 'librarian']);
  if (!authUser) return;
  const fineId = Number(req.body?.fine_id || 0);
  if (!fineId) return jsonError(res, 'Fine ID is required');
  const fine = await getRecord('fines', fineId);
  if (!fine || fine.status !== 'pending') return jsonError(res, 'Pending fine not found', 404);
  await updateRecord('fines', fineId, { status: 'paid', paid_date: nowIso() });
  return success(res, 'Fine marked as paid');
});

router.post('/fines/waive', async (req, res) => {
  const authUser = await requireAuth(req, res, ['admin']);
  if (!authUser) return;
  const fineId = Number(req.body?.fine_id || 0);
  if (!fineId) return jsonError(res, 'Fine ID is required');
  const fine = await getRecord('fines', fineId);
  if (!fine || fine.status !== 'pending') return jsonError(res, 'Pending fine not found', 404);
  await updateRecord('fines', fineId, { status: 'waived' });
  return success(res, 'Fine waived');
});

router.get('/reports/dashboard', async (req, res) => {
  const authUser = await requireAuth(req, res, ['admin', 'librarian']);
  if (!authUser) return;
  const lookups = await loadLookups();
  const books = lookups.books.filter((book) => book.status === 'active');
  const transactions = lookups.transactions;
  const fines = await loadCollection('fines');

  const usersByRole = { admin: 0, librarian: 0, student: 0 };
  for (const user of lookups.users.filter((user) => user.status === 'active')) {
    if (usersByRole[user.role] !== undefined) usersByRole[user.role] += 1;
  }

  const activeBorrows = transactions.filter((tx) => transactionStatus(tx) === 'checked_out').length;
  const overdueBooks = transactions.filter((tx) => transactionStatus(tx) === 'overdue').length;
  const pendingFines = fines.filter((fine) => fine.status === 'pending').reduce((sum, fine) => sum + Number(fine.amount || 0), 0);
  const paidFines = fines.filter((fine) => fine.status === 'paid').reduce((sum, fine) => sum + Number(fine.amount || 0), 0);
  const now = new Date();
  const monthCheckouts = transactions.filter((tx) => {
    const date = new Date(tx.checkout_date);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;
  const dueToday = transactions.filter((tx) => transactionStatus(tx) === 'checked_out' && new Date(tx.due_date).toDateString() === new Date().toDateString()).length;

  const recentTransactions = await Promise.all(
    transactions
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
      .slice(0, 10)
      .map((tx) => buildTransactionRecord(tx, lookups.usersById, lookups.booksById))
  );

  const borrowCounts = new Map();
  for (const tx of transactions) {
    borrowCounts.set(String(tx.book_id), (borrowCounts.get(String(tx.book_id)) || 0) + 1);
  }
  const popularBooks = books
    .map((book) => ({ ...book, borrow_count: borrowCounts.get(String(book.id)) || 0 }))
    .sort((a, b) => b.borrow_count - a.borrow_count)
    .slice(0, 5);

  return send(res, 200, {
    stats: {
      total_books: books.length,
      total_copies: books.reduce((sum, book) => sum + Number(book.total_copies || 0), 0),
      active_borrowers: activeBorrows,
      overdue_books: overdueBooks,
      pending_fines: pendingFines,
      paid_fines: paidFines,
      month_checkouts: monthCheckouts,
      due_today: dueToday,
    },
    users_by_role: usersByRole,
    recent_transactions: recentTransactions,
    popular_books: popularBooks,
  });
});

router.get('/reports/analytics', async (req, res) => {
  const authUser = await requireAuth(req, res, ['admin']);
  if (!authUser) return;
  const lookups = await loadLookups();
  const now = new Date();
  const monthly = [];
  for (let i = 11; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const checkouts = lookups.transactions.filter((tx) => String(tx.checkout_date || '').startsWith(key)).length;
    const returns = lookups.transactions.filter((tx) => tx.return_date && String(tx.return_date).startsWith(key)).length;
    monthly.push({ month: key, checkouts, returns });
  }

  const booksByCategory = lookups.categories.map((category) => ({
    category: category.name,
    count: lookups.books.filter((book) => String(book.category_id) === String(category.id) && book.status === 'active').length,
  }));

  const topBooks = lookups.books
    .map((book) => ({ title: book.title, author: book.author, borrow_count: lookups.transactions.filter((tx) => String(tx.book_id) === String(book.id)).length }))
    .sort((a, b) => b.borrow_count - a.borrow_count)
    .slice(0, 10);

  const overdueByDepartment = new Map();
  for (const tx of lookups.transactions.filter((item) => transactionStatus(item) === 'overdue')) {
    const dept = lookups.usersById.get(String(tx.user_id))?.department || 'Unassigned';
    overdueByDepartment.set(dept, (overdueByDepartment.get(dept) || 0) + 1);
  }

  return send(res, 200, {
    monthly_trends: monthly,
    books_by_category: booksByCategory,
    top_books: topBooks,
    overdue_by_department: Array.from(overdueByDepartment.entries()).map(([department, overdue_count]) => ({ department, overdue_count })),
  });
});

router.get('/reports/activity', async (req, res) => {
  const authUser = await requireAuth(req, res, ['admin', 'librarian']);
  if (!authUser) return;
  const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
  const activities = (await loadCollection('activity_log'))
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    .slice(0, limit);
  const users = await loadCollection('users');
  const usersById = new Map(users.map((user) => [String(user.id), user]));
  return send(res, 200, {
    activities: activities.map((activity) => ({
      ...activity,
      user_name: activity.user_id ? (usersById.get(String(activity.user_id))?.full_name || null) : null,
    })),
  });
});

router.get('/users', async (req, res) => {
  const authUser = await requireAuth(req, res, ['admin']);
  if (!authUser) return;
  const page = Math.max(1, Number(req.query.page || 1));
  const perPage = Math.min(50, Math.max(1, Number(req.query.per_page || 20)));
  const role = String(req.query.role || '').trim();
  const search = String(req.query.search || '').trim().toLowerCase();
  let users = await loadCollection('users');
  if (role) users = users.filter((user) => user.role === role);
  if (search) {
    users = users.filter((user) => [user.full_name, user.email, user.matric_number].filter(Boolean).join(' ').toLowerCase().includes(search));
  }
  users = users.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  const safe = users.map(({ password_hash, ...user }) => user);
  return paginated(res, safe.slice((page - 1) * perPage, (page - 1) * perPage + perPage), safe.length, page, perPage);
});

router.get('/users/:id', async (req, res) => {
  const authUser = await requireAuth(req, res, ['admin', 'librarian']);
  if (!authUser) return;
  const user = await getRecord('users', req.params.id);
  if (!user) return jsonError(res, 'User not found', 404);
  const [transactions, fines] = await Promise.all([loadCollection('transactions'), loadCollection('fines')]);
  const activeBorrows = transactions.filter((tx) => String(tx.user_id) === String(user.id) && ['checked_out', 'overdue'].includes(transactionStatus(tx))).length;
  const totalTransactions = transactions.filter((tx) => String(tx.user_id) === String(user.id)).length;
  const outstandingFines = fines.filter((fine) => String(fine.user_id) === String(user.id) && fine.status === 'pending').reduce((sum, fine) => sum + Number(fine.amount || 0), 0);
  const { password_hash, ...safeUser } = user;
  return send(res, 200, { user: { ...safeUser, active_borrows: activeBorrows, total_transactions: totalTransactions, outstanding_fines: outstandingFines } });
});

router.post('/users', async (req, res) => {
  const authUser = await requireAuth(req, res, ['admin']);
  if (!authUser) return;
  const email = String(req.body?.email || '').trim();
  const password = String(req.body?.password || '');
  const fullName = String(req.body?.full_name || '').trim();
  const role = ['admin', 'librarian', 'student'].includes(req.body?.role) ? req.body.role : 'student';
  if (!email || !password || !fullName) return jsonError(res, 'Email, password, and full name are required');
  if (await findUserByEmail(email)) return jsonError(res, 'Email already registered', 409);

  const id = await allocateId('users');
  const user = {
    id,
    email,
    password_hash: await bcrypt.hash(password, 10),
    full_name: fullName,
    matric_number: req.body?.matric_number ? String(req.body.matric_number).trim() : null,
    role,
    department: req.body?.department ? String(req.body.department).trim() : null,
    phone: req.body?.phone ? String(req.body.phone).trim() : null,
    avatar_url: null,
    status: 'active',
    max_books: Number(req.body?.max_books || MAX_BOOKS_PER_STUDENT),
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  await saveRecord('users', id, user);
  return success(res, 'User created successfully', { id }, 201);
});

router.put('/users/:id', async (req, res) => {
  const authUser = await requireAuth(req, res, ['admin']);
  if (!authUser) return;
  const user = await getRecord('users', req.params.id);
  if (!user) return jsonError(res, 'User not found', 404);
  const allowed = ['full_name', 'email', 'matric_number', 'role', 'department', 'phone', 'status', 'max_books'];
  const patch = { updated_at: nowIso() };
  for (const field of allowed) {
    if (Object.prototype.hasOwnProperty.call(req.body || {}, field)) patch[field] = req.body[field];
  }
  if (req.body?.password) patch.password_hash = await bcrypt.hash(String(req.body.password), 10);
  await updateRecord('users', req.params.id, patch);
  return success(res, 'User updated successfully');
});

router.delete('/users/:id', async (req, res) => {
  const authUser = await requireAuth(req, res, ['admin']);
  if (!authUser) return;
  if (String(authUser.id) === String(req.params.id)) return jsonError(res, 'Cannot delete your own account', 409);
  const transactions = await loadCollection('transactions');
  if (transactions.some((tx) => String(tx.user_id) === String(req.params.id) && ['checked_out', 'overdue'].includes(transactionStatus(tx)))) {
    return jsonError(res, 'Cannot delete user with active transactions', 409);
  }
  await updateRecord('users', req.params.id, { status: 'inactive', updated_at: nowIso() });
  return success(res, 'User deactivated successfully');
});

router.get('/reservations/my', async (req, res) => {
  const authUser = await requireAuth(req, res);
  if (!authUser) return;
  const reservations = await loadCollection('reservations');
  const books = await loadCollection('books');
  const booksById = new Map(books.map((book) => [String(book.id), book]));
  const mapped = reservations
    .filter((reservation) => String(reservation.user_id) === String(authUser.id))
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    .map((reservation) => ({
      ...reservation,
      book_title: booksById.get(String(reservation.book_id))?.title || null,
      book_author: booksById.get(String(reservation.book_id))?.author || null,
      cover_image: booksById.get(String(reservation.book_id))?.cover_image || null,
    }));
  return send(res, 200, { reservations: mapped });
});

router.post('/reservations', async (req, res) => {
  const authUser = await requireAuth(req, res);
  if (!authUser) return;
  const bookId = Number(req.body?.book_id || 0);
  if (!bookId) return jsonError(res, 'Book ID is required');
  const book = await getRecord('books', bookId);
  if (!book || book.status !== 'active') return jsonError(res, 'Book not found or unavailable', 404);

  const reservations = await loadCollection('reservations');
  const transactions = await loadCollection('transactions');
  if (reservations.some((reservation) => String(reservation.user_id) === String(authUser.id) && String(reservation.book_id) === String(bookId) && reservation.status === 'active')) {
    return jsonError(res, 'You already have an active reservation for this book', 409);
  }
  if (transactions.some((tx) => String(tx.user_id) === String(authUser.id) && String(tx.book_id) === String(bookId) && ['checked_out', 'overdue'].includes(transactionStatus(tx)))) {
    return jsonError(res, 'You already have this book checked out', 409);
  }

  const reservationId = await allocateId('reservations');
  const reservation = {
    id: reservationId,
    user_id: authUser.id,
    book_id: bookId,
    reserved_date: nowIso(),
    expiry_date: addDaysIso(7),
    status: 'active',
    created_at: nowIso(),
  };
  await saveRecord('reservations', reservationId, reservation);

  const activityId = await allocateId('activity_log');
  await saveRecord('activity_log', activityId, { id: activityId, user_id: authUser.id, action: 'reserve', entity_type: 'reservation', entity_id: reservationId, details: { book: book.title, book_id: bookId }, ip_address: req.ip || null, created_at: nowIso() });

  return success(res, 'Book reserved successfully', { reservation_id: reservationId, expiry_date: reservation.expiry_date }, 201);
});

router.use((req, res) => jsonError(res, 'Endpoint not found', 404));

exports.api = functions.https.onRequest(app);