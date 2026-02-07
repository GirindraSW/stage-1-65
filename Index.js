// const express = require('express') old calling package ("type" : "commonjs")
import express from "express"; //need to add in package.json ("type" : "module")

const app = express()
const port = 3000

app.set("view engine", "hbs");
app.set("views", "src/views");

app.use("/assets", express.static("src\assets"))
// req => from client to the server
// res => from server to the client
app.get("/home", (req, res) => {
  res.render("index")
})
app.get("/contact", (req, res) => {
  res.render("contact")
})
app.get("/myproject", (req, res) => {
  res.render("my_project")
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})


//note : 
// npm install -g (global) nodemon is used to install as global, so not appears in dependencies
// npm install -D (global) nodemon is used to install as "devDependencies" (not need in production environment)

// in dependencies/scripts is changing from ""scripts": {"test": "echo \"Error: no test specified\" && exit 1"  },"
// to "start": "nodemon index.js" 
    
