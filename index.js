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

// Backend Connected Code
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fcqpd.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        console.log("Data Connected");

        const productsCollection = client.db('computer_village').collection('products');
        const myOrderCollection = client.db('computer_village').collection('myOrder');
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

        app.post('/myorder', async (req, res) => {
            const myItems = req.body;
            const result = await myOrderCollection.insertOne(myItems);
            res.send(result);
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