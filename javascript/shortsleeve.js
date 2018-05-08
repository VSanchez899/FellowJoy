$('.shirtColor').on('click', function(e) {
    $('#shirt').attr('src', 'images/shirt' + ($('.shirtColor').index($(e.target)) + 1) + '.jpg');
});

$('#shirtOptions').change(function() {
    $("img[name=image-swap]").attr("src", $(this).val());
});