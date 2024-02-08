const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();

const userSchema = new mongoose.Schema({
    name: { type: String, required: true},
    email: {type: String, required: true, unique:true }
});

const User = mongoose.model('User', userSchema);

module.exports = mongoose.model('User', userSchema);

router.get('/', async (req, res) => {
    console.log('GET /users route reached');
    try {
      const users = await User.find();
      res.json(users);
      console.log('Success')
    } catch (err) {
      console.error(err);
      res.status(500).send('Error fetching users');
    }
  });

router.post('/', async (req, res) => {
    try {
        const user = new User(req.body);
        const savedUser = await user.save();
        res.json(savedUser);
    } catch (err) {
        console.error(err);
        res.status(400).send('Error creating user');
    }
});

router.delete('/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        await User.findByIdAndDelete(userId);
        res.json({message: `User with ID ${userId} deleted successfully`});
    } catch (err) {
        console.error(err);
    res.status(500).send('Error deleting user');
  }
});

router.put('/:id', async (req, res) => {
    const userId = req.params.id;
    const { name, email } = req.body;
    try {
        const updatedUser = await User.findByIdAndUpdate(
          userId,
          { name, email },
          { new: true }
        );
    
        res.json(updatedUser);
      } catch (err) {
        console.error(err);
        res.status(500).send('Error updating user');
      }
    });

module.exports = router;