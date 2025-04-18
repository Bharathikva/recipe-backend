const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models/db');


// 👉 Signup API
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  // Check if any field is empty
  if (!name || !email || !password) {
    return res.status(400).send('❌ All fields are required');
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
    db.query(sql, [name, email, hashedPassword], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).send('❌ Email already registered');
        }
        return res.status(500).send('❌ Server error');
      }

      res.status(201).send('✅ Registered successfully');
    });
  } catch (err) {
    res.status(500).send('❌ Something went wrong');
  }
});

// 👉 Login API
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  // Check for missing fields
  if (!email || !password) {
    return res.status(400).send('❌ Email and password are required');
  }

  const sql = 'SELECT * FROM users WHERE email = ?';

  db.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).send('❌ Server error');

    if (results.length === 0) {
      return res.status(401).send('❌ Invalid email');
    }

    const user = results[0];
    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return res.status(401).send('❌ Wrong password');
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: '1d'
    });

    res.status(200).json({
      message: '✅ Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  });
});

// 👉 Get user details by ID
router.get('/user/:id', (req, res) => {
    const userId = req.params.id;
  
    const sql = 'SELECT id, name, email, profile FROM users WHERE id = ?';
    db.query(sql, [userId], (err, results) => {
      if (err) return res.status(500).send('❌ Server error');
  
      if (results.length === 0) {
        return res.status(404).send('❌ User not found');
      }
  
      res.status(200).json(results[0]);
    });
  });

  // 👉 Update user details by ID
  router.put('/user/:id', (req, res) => {
    const userId = req.params.id;
    const { name, email, profile } = req.body;
  
    if (!name || !email) {
      return res.status(400).json({ message: '❌ Name and Email are required' });
    }
  
    const sql = 'UPDATE users SET name = ?, email = ?, profile = ? WHERE id = ?';
    db.query(sql, [name, email, profile || null, userId], (err, result) => {
      if (err) return res.status(500).json({ message: '❌ Server error' });
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: '❌ User not found' });
      }
  
      res.status(200).json({ message: '✅ Profile updated successfully' });
    });
  });
  
  router.post('/user/:id/saved-meals', (req, res) => {
    const userId = req.params.id;
    const { mealId } = req.body;
  
    if (!mealId) {
      return res.status(400).json({ message: '❌ Meal ID is required' });
    }
  
    const checkSql = 'SELECT * FROM saved_meals WHERE user_id = ? AND meal_id = ?';
    db.query(checkSql, [userId, mealId], (checkErr, results) => {
      if (checkErr) {
        console.error('Check error:', checkErr);
        return res.status(500).json({ message: '❌ Server error', error: checkErr.sqlMessage });
      }
  
      if (results.length > 0) {
        return res.status(409).json({ message: '⚠️ Meal already saved' });
      }
  
      // ✅ insertErr is only available here!
      const insertSql = 'INSERT INTO saved_meals (user_id, meal_id) VALUES (?, ?)';
      db.query(insertSql, [userId, mealId], (insertErr, result) => {
        if (insertErr) {
          console.error('Insert error:', insertErr);
          return res.status(500).json({ message: '❌ Server error', error: insertErr.sqlMessage });
        }
  
        res.status(201).json({ message: '✅ Meal saved successfully' });
      });
    });
  });
  

  router.get('/user/:id/saved-meals', (req, res) => {
    const userId = req.params.id;
  
    const sql = 'SELECT meal_id FROM saved_meals WHERE user_id = ?';
    db.query(sql, [userId], (err, results) => {
      if (err) return res.status(500).json({ message: '❌ Server error' });
  
      const mealIds = results.map(row => row.meal_id);
      res.status(200).json({ mealIds });
    });
  });

  router.delete('/user/:id/saved-meals/:mealId', (req, res) => {
    const userId = req.params.id;
    const mealId = req.params.mealId;
  
    console.log('🧨 Incoming DELETE for:', { userId, mealId });
  
    const sql = 'DELETE FROM saved_meals WHERE user_id = ? AND meal_id = ?';
    db.query(sql, [userId, mealId], (err, result) => {
      if (err) {
        console.error('❌ SQL Error:', err);
        return res.status(500).json({ message: '❌ Server error', error: err });
      }
  
      console.log('✅ Deletion Result:', result);
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: '❌ Meal not found in saved list' });
      }
  
      res.status(200).json({ message: '✅ Meal removed from saved list' });
    });
  });
  
  
  
  

module.exports = router;
