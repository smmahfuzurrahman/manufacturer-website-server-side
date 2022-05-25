const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express()
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// Middle Ware
app.use(cors());
app.use(express.json());
const jwt = require('jsonwebtoken');
const { decode } = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Backend Connected Code
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fcqpd.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// Jwt Token
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: "Un Authorized Access" });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' });
        }
        req.decoded = decoded;
        next();
    });
}


async function run() {
    try {
        await client.connect();
        console.log("Data Connected");

        const productsCollection = client.db('computer_village').collection('products');
        const myOrderCollection = client.db('computer_village').collection('myOrder');
        const paymentCollection = client.db('computer_village').collection('payments');
        const reviewCollection = client.db('computer_village').collection('review');
        const userCollection = client.db('computer_village').collection('users');

        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester })
            if (requesterAccount.role === 'admin') {
                next();
            }
            else {
                res.status(403).send({ message: "Forbidden" })
            }
        }

        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email })
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin });
        })

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
            res.send({ result, token });
        })

        app.put('/user/admin/:email', verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' },
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const service = req.body;
            const price = service.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({
                clientSecret: paymentIntent.client_secret
            })
        });


        app.patch('/myorder/:id', async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    paid: true,
                    transcationId: payment.transcationId,
                }
            }
            const result = await paymentCollection.insertOne(payment);
            const updateBooking = await bookingCollection.updateOne(filter, updateDoc);
            res.send(updateDoc);
        })

        // GET ALL PRODUCT IN products server
        app.get('/products', async (req, res) => {
            const query = {};
            const cursor = productsCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        })
        // Get Singel Product /products/:id
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const productInfo = await productsCollection.findOne(query);
            res.send(productInfo);
        })
        // Update data base in a single product
        app.post('/myorder', async (req, res) => {
            const myItems = req.body;
            const result = await myOrderCollection.insertOne(myItems);
            res.send(result);
        })
        // Get single product take database show MyOrder route
        // app.get('/myorder', async (req, res) => {
        //     const email = req.query.email;
        //     const decodedEmail = req.decode.email;
        //     if (email === decode) {
        //         const query = { email: email }
        //         const cursor = myOrderCollection.find(query);
        //         const items = await cursor.toArray();
        //         return res.send(items)
        //     }
        //     else {
        //         return res.status(403).send({ message: 'forbidden access' });
        //     }
        // });

        app.get('/myorder', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const cursor = myOrderCollection.find(query);
            const items = await cursor.toArray();
            res.send(items)
        });

        // Get Singel My Order /myorder/:id
        app.get('/myorder/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const productInfo = await myOrderCollection.findOne(query);
            res.send(productInfo);
        })
        // Delete Singel My Order /myorder/:id
        app.delete('/myorder/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await myOrderCollection.deleteOne(query);
            res.send(result);
        })

        // review
        app.get('/review', async (req, res) => {
            const query = {};
            const cursor = reviewCollection.find(query);
            const review = await cursor.toArray();
            res.send(review);
        })
        app.post('/review', async (req, res) => {
            const allReview = req.body;
            const result = await reviewCollection.insertOne(allReview);
            res.send(result);
        })
        app.get('/user', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        })
    }
    finally {

    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`listening on port ${port}`)
})