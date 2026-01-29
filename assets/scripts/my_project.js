
//get element
const biodata = document.getElementById("biodata");
const userList = document.getElementById("userList");

//state (temporarry save file)
let users = [];

// submit form
biodata.addEventListener("submit", function (e){
    e.preventDefault();

    let firstName = document.getElementById("fname").value;
    let lastName = document.getElementById("lname").value;

    const user = {firstName, lastName}

    users.push(user);
    console.log(users);

    changeElement();
})

function changeElement(){
    document.getElementById
}