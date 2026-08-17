// ============================================
// BACKEND SERVER - Complete Code
// ============================================

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

dotenv.config();
const app = express();

// ============================================
// GLOBAL MIDDLEWARES (Add these lines!)
// ============================================
app.use(express.json()); // Allows your server to read incoming JSON data
app.use(cors());         // Allows your frontend to communicate with your backend safely
app.use(helmet());       // Adds basic security headers


// ============================================
// MODELS
// ============================================

// User Model
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  avatar: { type: String, default: '' },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

// Group Model
const groupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    joinedAt: { type: Date, default: Date.now },
    role: { type: String, enum: ['admin', 'member'], default: 'member' }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

groupSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Group = mongoose.model('Group', groupSchema);

// Expense Model
const expenseSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0.01 },
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  splits: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
    settled: { type: Boolean, default: false }
  }],
  category: { type: String, enum: ['food', 'transport', 'entertainment', 'utilities', 'rent', 'shopping', 'other'], default: 'other' },
  date: { type: Date, default: Date.now },
  notes: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now }
});

expenseSchema.pre('save', function(next) {
  const totalSplit = this.splits.reduce((sum, split) => sum + split.amount, 0);
  if (Math.abs(totalSplit - this.amount) > 0.01) {
    next(new Error('Split amounts must sum to total expense amount'));
  }
  next();
});

const Expense = mongoose.model('Expense', expenseSchema);

// Balance Model
const balanceSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true, min: 0 },
  updatedAt: { type: Date, default: Date.now }
});

balanceSchema.index({ group: 1, from: 1, to: 1 }, { unique: true });
const Balance = mongoose.model('Balance', balanceSchema);

// ============================================
// MIDDLEWARE
// ============================================

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) throw new Error();
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Please authenticate' });
  }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const updateBalances = async (groupId, paidBy, splits) => {
  try {
    for (const split of splits) {
      const fromUserId = split.user;
      const amount = split.amount;
      if (fromUserId.toString() === paidBy.toString()) continue;

      let balance = await Balance.findOne({ group: groupId, from: fromUserId, to: paidBy });

      if (balance) {
        balance.amount += amount;
        balance.updatedAt = Date.now();
        await balance.save();
      } else {
        let reverseBalance = await Balance.findOne({ group: groupId, from: paidBy, to: fromUserId });
        if (reverseBalance) {
          if (reverseBalance.amount > amount) {
            reverseBalance.amount -= amount;
            await reverseBalance.save();
          } else if (reverseBalance.amount < amount) {
            const newBalance = new Balance({
              group: groupId,
              from: fromUserId,
              to: paidBy,
              amount: amount - reverseBalance.amount
            });
            await newBalance.save();
            await reverseBalance.deleteOne();
          } else {
            await reverseBalance.deleteOne();
          }
        } else {
          const newBalance = new Balance({ group: groupId, from: fromUserId, to: paidBy, amount: amount });
          await newBalance.save();
        }
      }
    }
  } catch (error) {
    console.error('Update balances error:', error);
    throw error;
  }
};

const simplifyBalances = (balances) => {
  const netBalance = {};
  
  balances.forEach(balance => {
    const fromId = balance.from._id.toString();
    const toId = balance.to._id.toString();
    if (!netBalance[fromId]) netBalance[fromId] = 0;
    if (!netBalance[toId]) netBalance[toId] = 0;
    netBalance[fromId] -= balance.amount;
    netBalance[toId] += balance.amount;
  });

  const debtors = [];
  const creditors = [];
  
  Object.entries(netBalance).forEach(([userId, amount]) => {
    if (amount < 0) debtors.push({ userId, amount: Math.abs(amount) });
    else if (amount > 0) creditors.push({ userId, amount });
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const simplifiedTransactions = [];
  let i = 0, j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const minAmount = Math.min(debtor.amount, creditor.amount);
    simplifiedTransactions.push({ from: debtor.userId, to: creditor.userId, amount: minAmount });
    debtor.amount -= minAmount;
    creditor.amount -= minAmount;
    if (debtor.amount === 0) i++;
    if (creditor.amount === 0) j++;
  }

  return simplifiedTransactions;
};

// ============================================
// CONTROLLERS
// ============================================

// Auth Controllers
const authController = {
  register: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { name, email, password } = req.body;
      const existingUser = await User.findOne({ email });
      if (existingUser) return res.status(400).json({ message: 'User already exists' });

      const user = new User({ name, email, password });
      await user.save();

      const token = generateToken(user._id);
      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Server error during registration' });
    }
  },

  login: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user) return res.status(401).json({ message: 'Invalid credentials' });

      const isMatch = await user.comparePassword(password);
      if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

      const token = generateToken(user._id);
      res.json({
        message: 'Login successful',
        token,
        user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error during login' });
    }
  },

  getCurrentUser: async (req, res) => {
    try {
      res.json({
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          avatar: req.user.avatar,
          friends: req.user.friends
        }
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

// Group Controllers
const groupController = {
  createGroup: async (req, res) => {
    try {
      const { name, description, members } = req.body;
      const memberList = [
        { user: req.user._id, role: 'admin' },
        ...(members || []).map(memberId => ({ user: memberId, role: 'member' }))
      ];

      const group = new Group({ name, description, members: memberList, createdBy: req.user._id });
      await group.save();
      await group.populate('members.user', 'name email avatar');

      res.status(201).json({ message: 'Group created successfully', group });
    } catch (error) {
      console.error('Create group error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  getUserGroups: async (req, res) => {
    try {
      const groups = await Group.find({ 'members.user': req.user._id })
        .populate('members.user', 'name email avatar')
        .populate('createdBy', 'name email')
        .sort({ updatedAt: -1 });

      res.json({ groups });
    } catch (error) {
      console.error('Get groups error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  getGroupById: async (req, res) => {
    try {
      const group = await Group.findById(req.params.id)
        .populate('members.user', 'name email avatar')
        .populate('createdBy', 'name email');

      if (!group) return res.status(404).json({ message: 'Group not found' });

      const isMember = group.members.some(m => m.user._id.toString() === req.user._id.toString());
      if (!isMember) return res.status(403).json({ message: 'Access denied' });

      const balances = await Balance.find({ group: group._id })
        .populate('from', 'name email')
        .populate('to', 'name email');

      res.json({ group, balances: simplifyBalances(balances) });
    } catch (error) {
      console.error('Get group error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  addMember: async (req, res) => {
    try {
      const { userId } = req.body;
      const groupId = req.params.id;

      const group = await Group.findById(groupId);
      if (!group) return res.status(404).json({ message: 'Group not found' });

      const isAdmin = group.members.some(m => m.user.toString() === req.user._id.toString() && m.role === 'admin');
      if (!isAdmin) return res.status(403).json({ message: 'Only admins can add members' });

      const isMember = group.members.some(m => m.user.toString() === userId);
      if (isMember) return res.status(400).json({ message: 'User is already a member' });

      group.members.push({ user: userId, role: 'member' });
      await group.save();
      await group.populate('members.user', 'name email avatar');

      res.json({ message: 'Member added successfully', group });
    } catch (error) {
      console.error('Add member error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },



  getGroupExpenses: async (req, res) => {
    try {
      const expenses = await Expense.find({ group: req.params.id })
        .populate('paidBy', 'name email')
        .populate('splits.user', 'name email')
        .sort({ date: -1 });

      res.json({ expenses });
    } catch (error) {
      console.error('Get expenses error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }, // <--- ADD A COMMA HERE IF THERE ISN'T ONE

  // 👇 PASTE THE NEW CODE RIGHT HERE 👇
  joinGroup: async (req, res) => {
    try {
      const groupId = req.params.id; 
      
      const group = await Group.findById(groupId);
      if (!group) return res.status(404).json({ message: 'Group not found' });

      const isMember = group.members.some(m => m.user.toString() === req.user._id.toString());
      if (isMember) return res.status(400).json({ message: 'You are already a member of this group' });

      group.members.push({ user: req.user._id, role: 'member' });
      await group.save();
      await group.populate('members.user', 'name email avatar');

      res.json({ message: 'Successfully joined the group', group });
    } catch (error) {
      console.error('Join group error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
  // 👆 END OF NEW CODE 👆

}; // <--- This is the end of the groupController block





// Expense Controllers
const expenseController = {
  createExpense: async (req, res) => {
    try {
      const { description, amount, paidBy, groupId, splits, category, notes, date } = req.body;

      const group = await Group.findById(groupId);
      if (!group) return res.status(404).json({ message: 'Group not found' });

      const isMember = group.members.some(m => m.user.toString() === req.user._id.toString());
      if (!isMember) return res.status(403).json({ message: 'You are not a member of this group' });

      const splitUserIds = splits.map(s => s.user);
      const allMembers = group.members.map(m => m.user.toString());
      const invalidUsers = splitUserIds.filter(id => !allMembers.includes(id));
      if (invalidUsers.length > 0) {
        return res.status(400).json({ message: 'Some split users are not group members', invalidUsers });
      }

      const expense = new Expense({
        description,
        amount,
        paidBy: req.user._id,
        group: groupId,
        splits,
        category,
        notes,
        date: date || new Date()
      });

      await expense.save();
      await updateBalances(groupId, paidBy, splits);
      await expense.populate('paidBy', 'name email');
      await expense.populate('splits.user', 'name email');

      res.status(201).json({ message: 'Expense created successfully', expense });
    } catch (error) {
      console.error('Create expense error:', error);
      res.status(500).json({ message: error.message || 'Server error' });
    }
  },

  getExpenseById: async (req, res) => {
    try {
      const expense = await Expense.findById(req.params.id)
        .populate('paidBy', 'name email')
        .populate('splits.user', 'name email')
        .populate('group', 'name');

      if (!expense) return res.status(404).json({ message: 'Expense not found' });

      const group = await Group.findById(expense.group);
      const isMember = group.members.some(m => m.user.toString() === req.user._id.toString());
      if (!isMember) return res.status(403).json({ message: 'Access denied' });

      res.json({ expense });
    } catch (error) {
      console.error('Get expense error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  updateExpense: async (req, res) => {
    try {
      const expense = await Expense.findById(req.params.id);
      if (!expense) return res.status(404).json({ message: 'Expense not found' });

      const group = await Group.findById(expense.group);
      const isAdmin = group.members.some(m => m.user.toString() === req.user._id.toString() && m.role === 'admin');

      if (expense.paidBy.toString() !== req.user._id.toString() && !isAdmin) {
        return res.status(403).json({ message: 'Only payer or admin can update expense' });
      }

      const updateData = req.body;
      const updatedExpense = await Expense.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
        .populate('paidBy', 'name email')
        .populate('splits.user', 'name email');

      res.json({ message: 'Expense updated successfully', expense: updatedExpense });
    } catch (error) {
      console.error('Update expense error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  deleteExpense: async (req, res) => {
    try {
      const expense = await Expense.findById(req.params.id);
      if (!expense) return res.status(404).json({ message: 'Expense not found' });

      const group = await Group.findById(expense.group);
      const isAdmin = group.members.some(m => m.user.toString() === req.user._id.toString() && m.role === 'admin');

      if (expense.paidBy.toString() !== req.user._id.toString() && !isAdmin) {
        return res.status(403).json({ message: 'Only payer or admin can delete expense' });
      }

      await expense.deleteOne();
      res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
      console.error('Delete expense error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

// User Controllers
const userController = {
  searchUsers: async (req, res) => {
    try {
      const { query } = req.query;
      if (!query || query.length < 2) return res.json({ users: [] });

      const users = await User.find({
        $and: [
          { _id: { $ne: req.user._id } },
          { $or: [{ name: { $regex: query, $options: 'i' } }, { email: { $regex: query, $options: 'i' } }] }
        ]
      }).select('name email avatar').limit(10);

      res.json({ users });
    } catch (error) {
      console.error('Search users error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  getUserById: async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select('name email avatar friends');
      if (!user) return res.status(404).json({ message: 'User not found' });
      res.json({ user });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  addFriend: async (req, res) => {
    try {
      const { friendId } = req.body;
      if (friendId === req.user._id.toString()) {
        return res.status(400).json({ message: 'Cannot add yourself as friend' });
      }

      const friend = await User.findById(friendId);
      if (!friend) return res.status(404).json({ message: 'User not found' });

      if (req.user.friends.includes(friendId)) {
        return res.status(400).json({ message: 'Already friends' });
      }

      req.user.friends.push(friendId);
      await req.user.save();
      friend.friends.push(req.user._id);
      await friend.save();

      res.json({ message: 'Friend added successfully' });
    } catch (error) {
      console.error('Add friend error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  removeFriend: async (req, res) => {
    try {
      const { friendId } = req.params;
      req.user.friends = req.user.friends.filter(id => id.toString() !== friendId);
      await req.user.save();

      const friend = await User.findById(friendId);
      if (friend) {
        friend.friends = friend.friends.filter(id => id.toString() !== req.user._id.toString());
        await friend.save();
      }

      res.json({ message: 'Friend removed successfully' });
    } catch (error) {
      console.error('Remove friend error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

// ============================================
// ROUTES
// ============================================

// Auth Routes
app.post('/api/auth/register', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], authController.register);

app.post('/api/auth/login', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], authController.login);

app.get('/api/auth/me', authMiddleware, authController.getCurrentUser);

// Group Routes
app.use('/api/groups', authMiddleware);
app.post('/api/groups', groupController.createGroup);
app.get('/api/groups', groupController.getUserGroups);
app.get('/api/groups/:id', groupController.getGroupById);
app.post('/api/groups/:id/members', groupController.addMember);
app.get('/api/groups/:id/expenses', groupController.getGroupExpenses);

// 👇 PASTE THIS LINE HERE 👇
app.post('/api/groups/:id/join', groupController.joinGroup);
// Expense Routes
app.use('/api/expenses', authMiddleware);
app.post('/api/expenses', expenseController.createExpense);
app.get('/api/expenses/:id', expenseController.getExpenseById);
app.put('/api/expenses/:id', expenseController.updateExpense);
app.delete('/api/expenses/:id', expenseController.deleteExpense);

// User Routes
app.use('/api/users', authMiddleware);
app.get('/api/users/search', userController.searchUsers);
app.get('/api/users/:id', userController.getUserById);
app.post('/api/users/friends', userController.addFriend);
app.delete('/api/users/friends/:friendId', userController.removeFriend);

// ============================================
// ERROR HANDLING & SERVER STARTUP
// ============================================

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB Atlas');
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});