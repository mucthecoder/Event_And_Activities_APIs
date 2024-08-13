var express = require('express');
var router = express.Router();
const tickets = require("../models/ticketRegistration.model");

/* GET root page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Ticket stuff' });
});

const login = async(req,res) =>{
    try {
        const {email,password} = req.body;

        if (!email || !password ) {
            return res.status(400).json({ error: "All details are required" });
        }

        const findUser = await User.findOne({ email });

        const isPasswordCorrect = await bcrypt.compare(password,findUser?.password || "");

        if(!findUser || !isPasswordCorrect){
            return res.status(400).json({error:"Invalid email or password"});
        }

        const token = generateTokenAndSetCookie(findUser._id,res);

        res.status(201).json({
            token
        });

    } catch (error) {
        console.log("Error in login controller", error.message);
        res.status(500).json({error:"Internal Server Error"});
    }
};

router.get('/tickets', function(req, res, next) {
    const username=req.body.username;
    if (!username){
        return res.status(400).json({ error: "User not found" });
    }
    const ticket = await tickets.findOne({})

});

module.exports = router;
