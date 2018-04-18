// global varibles
var username = "jpottle776";
var password = "fellowjoy18";
var donation = false;

var signIn = document.getElementById("signInButton");

function signIntoAccount() {
    var usernameInput = document.getElementById("username").value;
    var passwordInput = document.getElementById("password").value;
    if (usernameInput === username && passwordInput === password) {
        window.location.href = "../html/makeDonation_User.html";
        donation = true;
        // console.log(donation)
        // console.log("yes!!!!");
        // console.log(usernameInput);
    } else {
        console.log("no.")
            // console.log(usernameInput);
    }
}

signIn.addEventListener("click", signIntoAccount);