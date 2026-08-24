import express, { Request, Response } from "express";
import { MongoClient } from "mongodb";

const app = express();
const port = 3000;

app.use(express.json());
const client = new MongoClient("mongodb://localhost:27017");
let mongoClient: MongoClient;

/** Mongo steps */
export async function dbConnect(): Promise<void> {
  mongoClient = await client.connect();
}

export function getClient(): MongoClient {
  if (!mongoClient) {
    throw new Error(
      "Database client is not connected. Call dbConnect() first.",
    );
  }
  return mongoClient;
}

export async function dbClose(): Promise<void> {
  await client.close();
}

export async function inserData(
  collectionName: string,
  data: any,
): Promise<void> {
  const db = getClient().db("E-commerce");
  const allCollections = await db.listCollections().toArray();
  const collectionExists = allCollections.some(
    (col) => col.name === collectionName,
  );

  if (!collectionExists) {
    await db.createCollection(collectionName);
  }

  await db.collection(collectionName).insertOne(data);
}

/** E-commerce routes */
const isValidName = (name: string): boolean => {
  let isValid = true;
  name
    .toLowerCase()
    .split("")
    .forEach((ch) => {
      ch.charCodeAt(0) >= 48 && ch.charCodeAt(0) <= 57
        ? (isValid = false)
        : null;
    });
  return isValid;
};

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/** Create a new customer  */
app.post("/ecommerce/createCustomer", async (req: Request, res: Response) => {
  const { name, email, password } = req.body ?? {};

  if (typeof name !== "string" || name.trim() === "" || !isValidName(name)) {
    return res
      .status(400)
      .json({ error: "name should not be null or non string" });
  }

  if (
    typeof email !== "string" ||
    email.trim() === "" ||
    !isValidEmail(email)
  ) {
    return res.status(400).json({ error: "email should be a valid email" });
  }

  if (
    typeof password !== "string" ||
    password.trim() === "" ||
    password.length < 8
  ) {
    return res
      .status(400)
      .json({ error: "password should be at least 8 characters long" });
  }

  await inserData("customers", {
    name: name,
    email: email,
    password: password,
  });

  return res.status(200).json({ message: "Customer created successfully" });
});

app.get("/ecommerce/customers/:name", async (req: Request, res: Response) => {
  const { name } = req.params;
  const db = getClient().db("E-commerce");
  const customer = await db.collection("customers").findOne({ name });
  if (!customer) {
    return res.status(404).json({ error: "Customer not found" });
  }
  return res.status(200).json({ name: customer.name, email: customer.email });
});

app.post("/ecommerce/login", async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "email and password are required" });
  }

  const db = getClient().db("E-commerce");
  const customer = await db.collection("customers").findOne({ email });

  if (!customer || customer.password !== password) {
    return res.status(404).json({ error: "invalid credentials" });
  }

  return res.status(200).json({ message: "Login successful" });
});

const products = {
  electronics: [
    { name: "Laptop", price: 999.99 },
    { name: "Phone", price: 599.99 },
    { name: "Tablet", price: 399.99 },
    { name: "Headphones", price: 199.99 },
  ],
  clothing: [
    { name: "T-shirt", price: 19.99 },
    { name: "Jeans", price: 49.99 },
    { name: "Jacket", price: 89.99 },
    { name: "Sneakers", price: 79.99 },
  ],
  books: [
    { name: "The Great Gatsby", price: 14.99 },
    { name: "To Kill a Mockingbird", price: 12.99 },
    { name: "1984", price: 9.99 },
    { name: "Pride and Prejudice", price: 11.99 },
  ],
};

app.get("/ecommerce/products", async (req: Request, res: Response) => {
  const collection = getClient().db("E-commerce").collection("products");

  const count = await collection.countDocuments();
  if (count === 0) {
    await collection.insertOne(products);
  }

  const { _id, ...productDoc } = (await collection.findOne({})) ?? {};
  return res.status(200).json(productDoc);
});

if (require.main === module) {
  dbConnect()
    .then(() => {
      app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
      });
    })
    .catch((err) => {
      console.error("Failed to connect to MongoDB", err);
      process.exit(1);
    });
}

export default app;
