// // global varibles
// var username = "jpottle776";
// var password = "fellowjoy18";
// var donation = false;

// var signIn = document.getElementById("signInButton");

// function signIntoAccount() {
//     var usernameInput = document.getElementById("username").value;
//     var passwordInput = document.getElementById("password").value;
//     if (usernameInput === username && passwordInput === password) {
//         window.location.href = "../html/makeDonation_User.html";
//         donation = true;
//         // console.log(donation)
//         // console.log("yes!!!!");
//         // console.log(usernameInput);
//     } else {
//         console.log("no.")
//             // console.log(usernameInput);
//     }
// }

// signIn.addEventListener("click", signIntoAccount);

var signUpPart1 = document.getElementById("signUp-1");
var signUpPart2 = document.getElementById("signUp-2");
var signUpPart3 = document.getElementById("signUp-3")
var next1 = document.getElementById("next1");
var next2 = document.getElementById("next2");

var prev1 = document.getElementById("prev1");
var prev2 = document.getElementById("prev2");

var password = document.getElementById("password").value;
var retypePassword = document.getElementById("retypePassword").value;

window.onload = function() {
    signUpPart2.style.display = "none";
    signUpPart3.style.display = "none";
}

next1.onclick = function() {
    // if (password != retypePassword) {
    // alert("Password does not match")
    // }
    // if (password === retypePassword) {
    signUpPart1.style.display = "none";
    signUpPart2.style.display = "block";
    // }
}

next2.onclick = function() {
    signUpPart2.style.display = "none"
    signUpPart3.style.display = "block"
}

prev1.onclick = function() {
    signUpPart2.style.display = "none"
    signUpPart1.style.display = "block"
}

prev2.onclick = function() {
    signUpPart3.style.display = "none"
    signUpPart2.style.display = "block"
}