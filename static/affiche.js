// Affiche à imprimer : bouton d'impression (A3, l'affiche seule).
(function () { var b = document.getElementById('aff-imprimer'); if (b) b.addEventListener('click', function () { window.print(); }); })();
