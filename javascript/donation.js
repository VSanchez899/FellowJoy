function setReadOnly() {
    var customDonation = document.getElementById("donationAmount");
    var payCustom = document.getElementById("customDonation");
    payCustom.readOnly = true;
    console.log(customDonation.value);
    if (payCustom.readOnly == true && customDonation.value == "custom") {
        payCustom.readOnly = false;
        console.log("E-YES")
    }
}




document.addEventListener("load", setReadOnly());