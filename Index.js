// const express = require('express') old calling package ("type" : "commonjs")
import express from "express"; //need to add in package.json ("type" : "module")

const app = express();
const port = 3000;

app.set("view engine", "hbs");
app.set("views", "src/views");

app.use("/assets", express.static("src/assets"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// req => from client to the server
// res => from server to the client
app.get("/home", (req, res) => {
  res.render("index");
});

app.get("/contact", contact); // render
app.post("/contact", handleContact); //handle submit data

// STATE temporarry save
const projects = [];

app.get("/myproject", (req, res) => {
  res.render("myproject", { projects });
});

app.post("/myproject", (req, res) => {
  const { pname, pstart, pend, pdesc, tech = [] } = req.body; //Destructuring

  projects.push({
    id: projects.length + 1,
    projectName: pname,
    projectStart: pstart,
    projectEnd: pend,
    projectDesc: pdesc,
    projectTech: Array.isArray(tech) ? tech : [tech],
  });

  res.redirect("/myproject");
  // res.json({ success: true });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

function contact(req, res) {
  res.render("contact");
}
function handleContact(req, res) {
  console.log(req.body);
}

//note :
// npm install -g (global) nodemon is used to install as global, so not appears in dependencies
// npm install -D (global) nodemon is used to install as "devDependencies" (not need in production environment)

// in dependencies/scripts is changing from ""scripts": {"test": "echo \"Error: no test specified\" && exit 1"  },"
// to "start": "nodemon index.js"
