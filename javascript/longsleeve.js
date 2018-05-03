$('.shirtColor').on('click', function(e) {
    $('#shirt').attr('src', 'images/shirtLong' + ($('.shirtColor').index($(e.target))) + '.jpg');
});

$('#shirtOptions').change(function() {
    $("img[name=image-swap]").attr("src", $(this).val());
});