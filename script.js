const API_KEY = "0ba50b1a0e817c1f5e8ba94951a3a3c2";

const buscar = document.getElementById("buscar");
const input = document.getElementById("search");
const results = document.getElementById("results");

buscar.addEventListener("click", buscarPelicula);

input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        buscarPelicula();
    }
});

async function buscarPelicula() {

    const texto = input.value.trim();

    if (!texto) return;

    results.innerHTML = "Buscando...";

    const url = `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(texto)}&language=es-MX`;

    try {

        const response = await fetch(url);
        const data = await response.json();

        results.innerHTML = "";

        if (!data.results || data.results.length === 0) {
            results.innerHTML = "No se encontraron resultados.";
            return;
        }

        data.results.forEach(movie => {

            const div = document.createElement("div");

            div.className = "result";

            div.innerHTML = `
                <strong>${movie.title}</strong><br>
                ${movie.release_date || "Sin fecha"}<br>
                TMDB ID: <strong>${movie.id}</strong>
            `;

            div.onclick = async () => {

                await navigator.clipboard.writeText(String(movie.id));

                alert("TMDB ID copiado: " + movie.id);

            };

            results.appendChild(div);

        });

    } catch (error) {

        console.error(error);

        results.innerHTML = "Error al consultar TMDB.";

    }

}
