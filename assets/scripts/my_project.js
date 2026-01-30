
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
    renderUsers();
})

// notif/header about project  submited
function changeElement(){
    document.getElementById("header-user").innerHTML = 
    `<p> project details submited</p>`
}

function renderUsers() {
    userList.innerHTML = "";

    for (let i = 0; i < users.length; i++) {
        userList.innerHTML += `
            <div class="col-md-4">
                <div class="card shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title">
                            ${users[i].firstName} ${users[i].lastName}
                        </h5>
                        <p class="card-text text-muted">
                            Project submitted
                        </p>
                    </div>
                </div>
            </div>
        `;
    }
}

// function renderUsers(){
//     userList.innerHTML = "";

//     for (let i = 0; i < users.length; i++){
//         userList.innerHTML += `
//          <div>
//         <h5>${users[i].firstName}</h5>
//         <h5>${users[i].lastName}</h5>
//         </div>
//         `
        
//     }
// }