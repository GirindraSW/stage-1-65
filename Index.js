// Index.js (ESM)
import dotenv from "dotenv"; // load .env content
dotenv.config();

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg"; //there are Client, Pool, etc.
import { engine } from "express-handlebars"; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const FALLBACK_IMAGE = "/assets/images/project-img.jpg"; //if no image imputed, is there but is nothing
const projectImages = new Map();

// Database pool
const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE || "stage-1-65",
  port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
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

// Simple health/logging route for debugging
app.get("/_health", (req, res) => {
  res.json({ ok: true, node_env: process.env.NODE_ENV || "development" });
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
app.get("/myproject", async (req, res) => {
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
      image: projectImages.get(project.id) || FALLBACK_IMAGE,
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
app.post("/myproject", async (req, res) => {
  try {
    const { pname, pstart, pend, pdesc, tech = [], imageData = "" } = req.body;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const insertProjectText = `
        INSERT INTO projects (name, start_date, end_date, description, created_at)
        VALUES ($1, $2, $3, $4, NOW()) RETURNING id;
      `;
      const r = await client.query(insertProjectText, [
        pname,
        pstart || null,
        pend || null,
        pdesc || null,
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

      // If image data is provided
      if (imageData && imageData.trim() !== "") {
        projectImages.set(projectId, imageData.trim());
      }
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
app.get("/myproject/edit/:id", async (req, res) => {
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
      image: projectImages.get(Number(id)) || FALLBACK_IMAGE,
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
app.post("/myproject/edit/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { pname, pstart, pend, pdesc, tech = [], imageData = "" } = req.body;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // Query to update an existing project in the 'projects' table.
      // It updates the project's name, start date, end date, and description based on the provided project ID.
      await client.query(
        `
          UPDATE projects
          SET name = $1, start_date = $2, end_date = $3, description = $4
          WHERE id = $5
        `,
        [pname, pstart || null, pend || null, pdesc || null, id],
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

      // If image data is provided, update it in the projectImages Map.
      if (imageData && imageData.trim() !== "") {
        projectImages.set(Number(id), imageData.trim());
      }
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
app.post("/myproject/delete/:id", async (req, res) => {
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

    projectImages.delete(Number(id));
    res.redirect("/myproject");
  } catch (err) {
    console.error("POST /myproject/delete/:id error:", err);
    res.status(500).send("Delete project failed");
  }
});

// rout to project details
app.get("/project-detail/:id", async (req, res) => {
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
        image: projectImages.get(Number(id)) || FALLBACK_IMAGE,
        durationText,
      },
    });
  } catch (err) {
    console.error("GET /project-detail/:id error:", err);
    res.status(500).send("Server error");
  }
});

app.get("/project-details/:id", (req, res) => {
  res.redirect(`/project-detail/${req.params.id}`);
});

// Start server with additional error handling
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

server.on("error", (err) => {
  console.error("Server error:", err);
  process.exit(1);
});

//note :
// npm install -g (global) nodemon is used to install as global, so not appears in dependencies
// npm install -D (global) nodemon is used to install as "devDependencies" (not need in production environment)

// in dependencies/scripts is changing from ""scripts": {"test": "echo \"Error: no test specified\" && exit 1"  },"
// to "start": "nodemon index.js"
