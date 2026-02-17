// Index.js (ESM)
import dotenv from "dotenv"; // load .env content
dotenv.config();

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg"; // there are Client, Pool, etc.
import crypto from "crypto";
import fs from "fs"; // have acces to read and edit
import multer from "multer"; //processing upload file
import { engine } from "express-handlebars"; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const FALLBACK_IMAGE = "/assets/images/project-img.jpg"; //if no image imputed, is there but is nothing
const sessions = new Map();
const uploadDir = path.join(__dirname, "src", "assets", "uploads");

// Database pool
const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE || "stage-1-65",
  port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
});

// changing string cookie http into javascrip object (example : "user=123"; theme=dark; session=abc" >>>>> { user: '123', theme: 'dark', session: 'abc' })
function parseCookies(cookieHeader = "") {
  return cookieHeader
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((acc, current) => {
      const separatorIndex = current.indexOf("=");
      if (separatorIndex === -1) return acc;
      const key = current.slice(0, separatorIndex);
      const value = current.slice(separatorIndex + 1);
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
}

// This function takes a plain-text password and generates a secure hash using a salt.
// This is crucial for storing passwords securely, as it prevents storing them in plain text.
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, savedHash) {
  if (!savedHash || !savedHash.includes(":")) return false;
  const [salt, key] = savedHash.split(":");
  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  if (candidate.length !== key.length) return false;
  return crypto.timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(key, "hex"));
}

async function ensureUsersTable() {
  // This asynchronous function ensures that the 'users' table exists in the PostgreSQL database.
  // If the table does not exist, it creates it with the defined schema.
  const createUsersTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;
  // Query: Executes the SQL command to create the 'users' table if it doesn't already exist.
  await pool.query(createUsersTableQuery);
}

async function ensureProjectsTableColumns() {
  await pool.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS image TEXT");
}

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, "_");
    cb(null, `${Date.now()}-${baseName}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (_req, file, cb) {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// View engine & partials
app.engine(
  "hbs",
  engine({
    extname: ".hbs",
    defaultLayout: "main",
    layoutsDir: path.join(__dirname, "src", "views", "layouts"),
    partialsDir: path.join(__dirname, "src", "views", "partials"),
    // helpers, helping output of the view format
    helpers: {

      // example, used on navbar
      ifEquals: function (arg1, arg2, options) {
        return arg1 == arg2 ? options.fn(this) : options.inverse(this);
      },

      // helper for technologies
      hasTech: function (technologies, techName) {
        return Array.isArray(technologies) && technologies.includes(techName);
      },

      // helper formate date
      formatDate: function (value) {
        if (!value) return "-";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "-";
        return date.toLocaleDateString("en-US", { //Indo before
          day: "2-digit",
          month: "long",
          year: "numeric",
        });
      },
      // helper date format (input)
      formatDateInput: function (value) {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        return date.toISOString().split("T")[0];
      },
    },
  }),
);
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "src", "views"));

// Middleware
app.use("/assets", express.static(path.join(__dirname, "src", "assets")));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));
app.use(express.json({ limit: "10mb" }));
app.use(async (req, res, next) => {
  try {
    const cookies = parseCookies(req.headers.cookie || "");
    const sid = cookies.sid;
    if (sid && sessions.has(sid)) { // Check if session ID exists and is active
      const session = sessions.get(sid);
      const userResult = await pool.query("SELECT id, email FROM users WHERE id = $1", [session.userId]);
      if (userResult.rows.length > 0) {
        req.user = userResult.rows[0];
        res.locals.currentUser = userResult.rows[0];
      } else {
        sessions.delete(sid); // If user not found, delete the invalid session
      }
    }
    next();
  } catch (err) {
    next(err);
  }
});

// Authenticated Middleware
function requireAuth(req, res, next) {
  if (!req.user) { // If user data is not present in the request (not authenticated)
    return res.redirect("/login"); // Redirect to the login page
  }
  next(); 
}

// Simple health/logging route for debugging
app.get("/_health", (req, res) => {
  res.json({ ok: true, node_env: process.env.NODE_ENV || "development" });
});

app.get("/", (req, res) => {
  res.redirect("/home");
});

// registration page
app.get("/register", (req, res) => {
  if (req.user) return res.redirect("/myproject");
  res.render("register", {
    title: "Register",
    active: "register",
  });
});

// Handle user register submission
app.post("/register", async (req, res) => {
  try {
    const { email = "", password = "" } = req.body;
    const normalizedEmail = String(email).trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).render("register", {
        title: "Register",
        active: "register",
        error: "Email and password are required.",
      });
    }

    // Query to check if a user with the given email already exists in the 'users' table.
    // This prevents duplicate registrations.
    const exists = await pool.query("SELECT id FROM users WHERE email = $1 LIMIT 1", [normalizedEmail]);
    if (exists.rows.length > 0) {
      return res.status(400).render("register", {
        title: "Register",
        active: "register",
        error: "Email is already registered.",
      });
    }

    const passwordHash = hashPassword(password);
    // Query to insert a new user into the 'users' table with their email and hashed password.
    // This stores the new user's credentials securely in the database.
    await pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2)",
      [normalizedEmail, passwordHash],
    );

    res.redirect("/login"); // Redirect to login page after successful registration
  } catch (err) {
    console.error("POST /register error:", err);
    res.status(500).send("Register failed");
  }
});

// Login page
app.get("/login", (req, res) => {
  if (req.user) return res.redirect("/myproject"); // If already logged in, redirect to myproject
  res.render("login", {
    title: "Login",
    active: "login",
  });
});

// Handle user login submission
app.post("/login", async (req, res) => {
  try {
    const { email = "", password = "" } = req.body;
    const normalizedEmail = String(email).trim().toLowerCase();

    // Query to retrieve user id, email, and password hash from the 'users' table based on the provided email.
    // This is used to verify the user's credentials during login.
    const userResult = await pool.query(
      "SELECT id, email, password_hash FROM users WHERE email = $1 LIMIT 1",
      [normalizedEmail],
    );

     // If no user found or password doesn't match, return an error
    if (userResult.rows.length === 0 || !verifyPassword(password, userResult.rows[0].password_hash)) {
      return res.status(401).render("login", {
        title: "Login",
        active: "login",
        error: "Invalid email or password.",
      });
    }

    const sid = crypto.randomBytes(24).toString("hex"); // Generate a new session ID
    sessions.set(sid, { userId: userResult.rows[0].id });
    res.setHeader("Set-Cookie", `sid=${sid}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax`);
    res.redirect("/myproject");
  } catch (err) {
    console.error("POST /login error:", err);
    res.status(500).send("Login failed");
  }
});

// Handle user logout
app.post("/logout", (req, res) => {
  const cookies = parseCookies(req.headers.cookie || "");
  const sid = cookies.sid;
  if (sid) {
    sessions.delete(sid);
  }
  res.setHeader("Set-Cookie", "sid=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax");
  res.redirect("/login");
});

// Routes Index.hbs/Home
app.get("/home", (req, res) => {
  res.render("Index", {
    title: "Home - My Portfolio",
    active: "home",
  });
});

// Routes contact.hbs
app.get("/contact", (req, res) => {
  res.render("contact", {
    title: "Contact Me",
    active: "contact",
  });
});

// take projects/data from database
app.get("/myproject", requireAuth, async (req, res) => {
  try {
    // query 
    const q = `
      SELECT p.*, COALESCE(json_agg(t.name) FILTER (WHERE t.name IS NOT NULL), '[]') AS technologies
      FROM projects p
      LEFT JOIN project_technologies pt ON p.id = pt.project_id
      LEFT JOIN technologies t ON pt.technology_id = t.id
      GROUP BY p.id
      ORDER BY p.created_at DESC;
    `;
    const result = await pool.query(q).catch(() => null); //execute query

    // if pool was fail or empty, fallback array is empty so it keeps rendering
    const projects = (result && result.rows ? result.rows : []).map((project) => ({
      ...project,
      image: project.image || FALLBACK_IMAGE,
    }));

    res.render("myproject", {
      projects,
      title: "My Projects",
      active: "project",
    });
  } catch (err) {
    console.error("GET /myproject error:", err);
    res.status(500).send("Server error (lihat console)");
  }
});

// POST (saving into DB) new project
app.post("/myproject", requireAuth, upload.single("image"), async (req, res) => {
  try {
    const { pname, pstart, pend, pdesc, tech = [] } = req.body;
    const imagePath = req.file ? `/assets/uploads/${req.file.filename}` : FALLBACK_IMAGE;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const insertProjectText = `
        INSERT INTO projects (name, start_date, end_date, description, image, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id;
      `;
      const r = await client.query(insertProjectText, [
        pname,
        pstart || null,
        pend || null,
        pdesc || null,
        imagePath,
      ]);
      const projectId = r.rows[0].id;
      const techs = (Array.isArray(tech) ? tech : [tech]).filter(Boolean);
      for (const techName of techs) {
        const existingTech = await client.query(
          "SELECT id FROM technologies WHERE LOWER(name) = LOWER($1) LIMIT 1",
          [techName],
        );
        let technologyId;
        if (existingTech.rows.length > 0) {
          technologyId = existingTech.rows[0].id;
        } else {
          const insertedTech = await client.query(
            "INSERT INTO technologies (name) VALUES ($1) RETURNING id",
            [techName],
          );
          technologyId = insertedTech.rows[0].id;
        }

        await client.query(
          "INSERT INTO project_technologies (project_id, technology_id) VALUES ($1, $2)",
          [projectId, technologyId],
        );
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
    res.redirect("/myproject");
  } catch (err) {
    console.error("POST /myproject error:", err);
    res.status(500).send("Create project failed"); //for inform if something is wrong
  }
});

// Route to display the edit project form
app.get("/myproject/edit/:id", requireAuth, async (req, res) => {
  try {
    //Edit Query
    const { id } = req.params; // Extract project ID from URL parameters
    const q = `
      SELECT p.*, COALESCE(json_agg(t.name) FILTER (WHERE t.name IS NOT NULL), '[]') AS technologies
      FROM projects p
      LEFT JOIN project_technologies pt ON p.id = pt.project_id
      LEFT JOIN technologies t ON pt.technology_id = t.id
      WHERE p.id = $1
      GROUP BY p.id;
    `;
    const result = await pool.query(q, [id]);
    if (result.rows.length === 0) {
      return res.status(404).send("Project tidak ditemukan");
    }

    const project = {
      ...result.rows[0],
      image: result.rows[0].image || FALLBACK_IMAGE,
    };

    res.render("edit-project", {
      title: "Edit Project",
      active: "project",
      project,
    });
  } catch (err) {
    console.error("GET /myproject/edit/:id error:", err);
    res.status(500).send("Server error");
  }
});

// Route to handle POST requests for updating an existing project
app.post("/myproject/edit/:id", requireAuth, upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const { pname, pstart, pend, pdesc, tech = [] } = req.body;
    const imagePath = req.file ? `/assets/uploads/${req.file.filename}` : null;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // Query to update an existing project in the 'projects' table.
      // It updates the project's name, start date, end date, and description based on the provided project ID.
      await client.query(
        `
          UPDATE projects
          SET name = $1, start_date = $2, end_date = $3, description = $4, image = COALESCE($5, image)
          WHERE id = $6
        `,
        [pname, pstart || null, pend || null, pdesc || null, imagePath, id],
      );

      // Query to delete
      await client.query("DELETE FROM project_technologies WHERE project_id = $1", [id]);

      // Process and insert updated technologies
      const techs = (Array.isArray(tech) ? tech : [tech]).filter(Boolean);
      for (const techName of techs) {
        // Query to check for an existing technology by name
        const existingTech = await client.query(
          "SELECT id FROM technologies WHERE LOWER(name) = LOWER($1) LIMIT 1",
          [techName],
        );
        let technologyId;
        if (existingTech.rows.length > 0) {
          technologyId = existingTech.rows[0].id; // Use existing technology ID
        } else {
          const insertedTech = await client.query(
            "INSERT INTO technologies (name) VALUES ($1) RETURNING id",
            [techName],
          );
          technologyId = insertedTech.rows[0].id; // Use the ID of the newly inserted technology
        }

        // Query to insert the association between the project and technology.
        await client.query(
          "INSERT INTO project_technologies (project_id, technology_id) VALUES ($1, $2)",
          [id, technologyId],
        );
      }

      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK"); // in case error
      throw e;
    } finally {
      client.release();
    }

    res.redirect("/myproject");
  } catch (err) {
    console.error("POST /myproject/edit/:id error:", err);
    res.status(500).send("Update project failed");
  }
});

// route dellete
app.post("/myproject/delete/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM project_technologies WHERE project_id = $1", [id]);
      await client.query("DELETE FROM projects WHERE id = $1", [id]);
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
    res.redirect("/myproject");
  } catch (err) {
    console.error("POST /myproject/delete/:id error:", err);
    res.status(500).send("Delete project failed");
  }
});

// rout to project details
app.get("/project-detail/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const q = `
      SELECT p.*, COALESCE(json_agg(t.name) FILTER (WHERE t.name IS NOT NULL), '[]') AS technologies
      FROM projects p
      LEFT JOIN project_technologies pt ON p.id = pt.project_id
      LEFT JOIN technologies t ON pt.technology_id = t.id
      WHERE p.id = $1
      GROUP BY p.id;
    `;
    const result = await pool.query(q, [id]);

    if (result.rows.length === 0) {
      return res.status(404).send("Project tidak ditemukan");
    }

    const project = result.rows[0];
    const start = project.start_date ? new Date(project.start_date) : null;
    const end = project.end_date ? new Date(project.end_date) : null;
    let durationText = "-";
    if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      const diffTime = Math.max(end - start, 0);
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      durationText = `${days} ${days === 1 ? "day" : "days"}`;
    }

    res.render("project-detail", {
      title: "Project Detail",
      active: "project",
      project: {
        ...project,
        image: project.image || FALLBACK_IMAGE,
        durationText,
      },
    });
  } catch (err) {
    console.error("GET /project-detail/:id error:", err);
    res.status(500).send("Server error");
  }
});

app.get("/project-details/:id", requireAuth, (req, res) => {
  res.redirect(`/project-detail/${req.params.id}`);
});

async function startServer() {
  try {
    await ensureUsersTable();
    await ensureProjectsTableColumns();

    const server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

    server.on("error", (err) => {
      console.error("Server error:", err);
      process.exit(1);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).send(`Upload error: ${err.message}`);
  }
  if (err && err.message === "Only image files are allowed") {
    return res.status(400).send(err.message);
  }
  return res.status(500).send("Server error");
});

//note :
// npm install -g (global) nodemon is used to install as global, so not appears in dependencies
// npm install -D (global) nodemon is used to install as "devDependencies" (not need in production environment)

// in dependencies/scripts is changing from ""scripts": {"test": "echo \"Error: no test specified\" && exit 1"  },"
// to "start": "nodemon index.js"
