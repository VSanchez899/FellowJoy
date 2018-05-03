var fnameDonation = document.getElementById("formFirstN");

if (fnameDonation.validity.valueMissing) {
    fnameDonation.setCustomValidity("Enter You First Name Please")
}