const express = require("express")
const cors= require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion } = require("mongodb");
require('dotenv').config()
const app= express()
const port= process.env.PORT || 5000;

//middleware
app.use(cors({
    origin: "http://localhost:5173",
    
}))
app.use(express.json())

// verifytoken- middleware

const verifyjwt =(req, res, next) =>{
    const authorization = req.headers.authorization;
    if(!authorization){
      return res.send({message : "No token"})
    }
    const token = authorization.split(" ")[1];
    jwt.verify(token, process.env.ACCESS_KEY_TOKEN, (err, decoded) =>{
        if(err) {
            return res.send({message: "Invalid Token"})
        }
        req.decoded = decoded;
        next();
    });
}

//verify saller

const verifySaller = async (req, res, next) => {
    const email =req.decoded.email;
    const query = {email : email}
    const user = await userCollection.findOne(query);
    if(user?.role !== "Saller"){
        return res.send({message: "Forbidden access"})
    }
    next()
};




//mongodb
const url = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.f4wqy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`

const client= new MongoClient(url, {
    serverApi:{
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
        tls: true,
        }
})

const dbConnect = async()=>{
    try{
       await client.connect()
       await client.db("admin").command({ ping: 1 });
        console.log("Database connected successfully");

        //get User
        app.get("/user/:email", async(req,res) =>{
            const query = {email: req.params.email};
            const user= await userCollection.findOne(query);
            res.send(user)
        })



        // insert user
        app.post("/users", async(req, res)=>{
            const user = req.body;
            const query= {email: user.email}
            const existingUser =  await userCollection.findOne(query)
            if (existingUser){
                return res.send({message: "user already exists"})
            }
            const result= await userCollection.insertOne(user);
            res.send(result)
        })

        //add-product

        app.post("/add-products",verifyjwt, verifySaller, async(req, res) =>{
            const product= req.body;
            const result= await productCollection.insertOne(product);
            res.send(result)
        })

        //get product
        app.get("/all-product", async(req, res)=>{
            const {title, sort,  category, brand} = req.query

            const query={}

            if(title){
                query.title= { $regex: title, $options: "i"}
            }
            if(category){
                query.category= { $regex: category, $options: "i"}
            }
            if(brand){
                query.brand= brand
            }
            
            const sortOption = sort === 'asc' ? 1 : -1
            const products= await productCollection.find(query).sort({price: sortOption}).toArray();
            const totalProducts= await productCollection.countDocuments(query);
            
            const productsInfo = await productCollection.find({}, {projection: {category:1, brand:1}}).toArray()
            const categories= [
                ...new Set(productsInfo.map((product)=> product.category))
            ]
            const brands= [
                ...new Set(productsInfo.map((product)=> product.brand))
            ]



            res.json({products,brands, categories, totalProducts})
        })

        

    }catch(error){
        console.log(error.name, error.message);
    }
}
dbConnect()

const userCollection = client.db("gadgetShop").collection("users")
const productCollection = client.db("gadgetShop").collection("products")


//api
app.get("/", (req, res)=>{
    res.send("Server is runninggg")
})


//jwt

app.post('/authen',(req, res) =>{
    const userEmail = req.body
    const token= jwt.sign(userEmail, process.env.ACCESS_KEY_TOKEN, {
        expiresIn:"10d"
    })
    res.send({token,success: true, message: 'Authenticated!'}); 
})

app.listen(port, ()=>{
    console.log(`Server is running on ${port}`);
})