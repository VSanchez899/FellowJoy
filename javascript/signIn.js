/* Background image */
window.onload = function() {
    var screenHeight = screen.height;
    var screenWidth = screen.width;
    $("#backgroundImage").height(screenHeight);
}

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
    signUpPart2.style.display = "none";
    signUpPart3.style.display = "block";
}

prev1.onclick = function() {
    signUpPart2.style.display = "none";
    signUpPart1.style.display = "block";
}

prev2.onclick = function() {
    signUpPart3.style.display = "none";
    signUpPart2.style.display = "block";
}

function validateStep1() {
    document.getElementById("fName").oninvalid = function() {
        signUpPart3.style.display = "none";
        signUpPart1.style.display = "block";
    }

    document.getElementById("lName").oninvalid = function() {
        signUpPart3.style.display = "none";
        signUpPart1.style.display = "block";
    }

    document.getElementById("Email").oninvalid = function() {
        signUpPart3.style.display = "none";
        signUpPart1.style.display = "block";
    }

    document.getElementById("password").oninvalid = function() {
        signUpPart3.style.display = "none";
        signUpPart1.style.display = "block";
    }

    document.getElementById("retypePassword").oninvalid = function() {
        signUpPart3.style.display = "none";
        signUpPart1.style.display = "block";
    }
}

function validateStep2() {
    document.getElementById("address").oninvalid = function() {
        signUpPart3.style.display = "none";
        signUpPart2.style.display = "block";
    }

    document.getElementById("city").oninvalid = function() {
        signUpPart3.style.display = "none";
        signUpPart2.style.display = "block";
    }

    document.getElementById("state").oninvalid = function() {
        signUpPart3.style.display = "none";
        signUpPart2.style.display = "block";
    }

    document.getElementById("zipCode").oninvalid = function() {
        signUpPart3.style.display = "none";
        signUpPart2.style.display = "block";
    }
}


function validateSignIn() {

    validateStep1();
    validateStep2();

}



var submit = document.getElementById("submit");

submit.addEventListener("click", validateSignIn);




var cardType = document.getElementById("card");
var cardNum = document.getElementById("cardNum");
var cvcNum = document.getElementById("cvcNum");
var expMonth = document.getElementById("month");
var expYear = document.getElementById("year");

cardType.oninput = function() {
    console.log(cardType.value)
    if (cardType.value === "") {
        cardNum.setAttribute("disabled", "disabled");
        cvcNum.setAttribute("disabled", "disabled");
        expMonth.setAttribute("disabled", "disabled");
        expYear.setAttribute("disabled", "disabled");
        cardNum.value = "";
        cvcNum.value = "";
        expMonth.value = "";
        expYear.value = "";
    }
    if (cardType.value === "visa") {
        cardNum.removeAttribute("disabled", "disabled");
        cvcNum.removeAttribute("disabled", "disabled");
        expMonth.removeAttribute("disabled", "disabled");
        expYear.removeAttribute("disabled", "disabled");
        cardNum.setAttribute("pattern", "^4[0-9]{12}(?:[0-9]{3})?$");
        cardNum.setAttribute("required", "required");
        cvcNum.setAttribute("required", "required");
        cvcNum.setAttribute("pattern", "^[0-9]{3}$");
        expMonth.setAttribute("required", "required");
        expYear.setAttribute("required", "required");
        alert("need credit card number")
    }
    if (cardType.value === "discover") {
        cardNum.removeAttribute("disabled", "disabled");
        cvcNum.removeAttribute("disabled", "disabled");
        expMonth.removeAttribute("disabled", "disabled");
        expYear.removeAttribute("disabled", "disabled");
        cardNum.setAttribute("pattern", "^6(?:011|5[0-9]{2})[0-9]{12}$");
        cardNum.setAttribute("required", "required");
        cvcNum.setAttribute("required", "required");
        cvcNum.setAttribute("pattern", "^[0-9]{3}$");
        expMonth.setAttribute("required", "required");
        expYear.setAttribute("required", "required");
        alert("need credit card number")
    }
    if (cardType.value === "amex") {
        cardNum.removeAttribute("disabled", "disabled");
        cvcNum.removeAttribute("disabled", "disabled");
        expMonth.removeAttribute("disabled", "disabled");
        expYear.removeAttribute("disabled", "disabled");
        cardNum.setAttribute("pattern", "^3[47][0-9]{13}$");
        cardNum.setAttribute("required", "required");
        cvcNum.setAttribute("required", "required");
        cvcNum.setAttribute("pattern", "^[0-9]{4}$");
        expMonth.setAttribute("required", "required");
        expYear.setAttribute("required", "required");
        alert("need credit card number")
    }
    if (cardType.value === "mastercard") {
        cardNum.removeAttribute("disabled", "disabled");
        cvcNum.removeAttribute("disabled", "disabled");
        expMonth.removeAttribute("disabled", "disabled");
        expYear.removeAttribute("disabled", "disabled");
        cardNum.setAttribute("pattern", "^(?:5[1-5][0-9]{2}|222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)[0-9]{12}$");
        cardNum.setAttribute("required", "required");
        cvcNum.setAttribute("required", "required");
        cvcNum.setAttribute("pattern", "^[0-9]{3}$");
        expMonth.setAttribute("required", "required");
        expYear.setAttribute("required", "required");
        alert("need credit card number")
    }
}



var signUpForm = document.getElementById("signUpForm");

signUpForm.onsubmit = function() {
    alert("You created an account with fellow joy")
}