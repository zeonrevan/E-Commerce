import express, { Request, Response } from 'express';
import {MongoClient} from 'mongodb';

const app = express();
const port = 3000;

app.use(express.json());
const client = new MongoClient("mongodb://localhost:27017");
const usersCollection = client.db("TestApplication").collection("users");
let dbClient: MongoClient;

export async function connectDB(): Promise<void> {
  dbClient =  await client.connect();
}

export function getClient(): MongoClient {
  if (!dbClient) {
    throw new Error("Database client is not connected. Call connectDB() first.");
  }
  return client;
}

export function getDBClient(): MongoClient {
  if (!dbClient) {
    throw new Error("Database client is not connected. Call connectDB() first.");
  }
  return dbClient;
}

export async function closeDB(): Promise<void> {
  await client.close();
}

interface User {
  id: number;
  name: string;
  email: string;
}

const users: User[] = [];
let nextId = 1;

const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

function isValidName(name:string):boolean{
  let isValid = true;
  for(const ch of name){
    if(ch.charCodeAt(0) >= 48 && ch.charCodeAt(0) <= 57){
      isValid = false;
      break;
    }
  }
  return isValid;
}

app.post('/testapplication/user', async (req: Request, res: Response) => {
  const { name, email, password } = req.body ?? {};

  if (typeof name !== 'string' || name.trim() === '' || !isValidName(name)) {
    return res.status(400).json({ error: 'name should not be null or non string' });
  }
  if (typeof email !== 'string' || !isValidEmail(email)) {
    return res.status(400).json({ error: 'a valid email is required' });
  }
  if (typeof password !== 'string' || password.trim() === '' || password.length < 8) {
    return res.status(400).json({ error: 'a valid password is required' });
  }

  const user: User = { id: nextId++, name, email };

  try {
    await usersCollection.insertOne({ ...user, password });
  } catch (err) {
    console.error('Error inserting user into MongoDB:', err);
    return res.status(500).json({ error: 'failed to create user' });
  }

  users.push(user);

  const inserted = await usersCollection.findOne(
    { name: user.name },
    { projection: { _id: 0, id: 1 } }
  );
  if (!inserted) {
    return res.status(500).json({ error: 'failed to retrieve created user' });
  }

  res.status(201).json({ id: inserted.id });
});

app.get('/testapplication/user', (req: Request, res: Response) => {
  res.json({ id: 1, name: 'John Doe', email: 'john.doe@example.com' });
});




app.post('/testapplication/login', (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== 'string' || !isValidEmail(email)) {
    return res.status(400).json({ error: 'a valid email is required' });
  }

  if (typeof password !== 'string' || password.trim() === '') {
    return res.status(400).json({ error: 'a valid password is required' });
  }

  res.status(200).json({ message: 'Login successful' });
});

if (require.main === module) {
  connectDB()
    .then(() => {
      app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
      });
    })
    .catch((err) => {
      console.error('Failed to connect to MongoDB', err);
      process.exit(1);
    });
}

export default app;