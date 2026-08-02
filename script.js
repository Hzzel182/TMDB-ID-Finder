const API_KEY = "0ba50b1a0e817c1f5e8ba94951a3a3c2";

const buscar = document.getElementById("buscar");
const input = document.getElementById("search");
const results = document.getElementById("results");

let timeoutBusqueda;

buscar.addEventListener("click", buscarPelicula);

input.addEventListener("input", () => {

    clearTimeout(timeoutBusqueda);

    if (input.value.trim() === "") {

        results.innerHTML = "";

        return;

    }

    timeoutBusqueda = setTimeout(buscarPelicula, 300);

});

input.addEventListener("keydown", (e) => {

    if (e.key === "Enter") {

        clearTimeout(timeoutBusqueda);

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

        await mostrar(data.results);

    }

    catch (error) {

        console.error(error);

        results.innerHTML = "Error al consultar TMDB.";

    }

}

async function obtenerDetalles(id){

    const url=`https://api.themoviedb.org/3/movie/${id}?api_key=${API_KEY}&language=es-MX`;

    const response=await fetch(url);

    return await response.json();

}

async function copiarID(id){

    try{

        await navigator.clipboard.writeText(String(id));

    }

    catch(e){

        console.error(e);

    }

    results.innerHTML="";

    input.value="";

    input.focus();

}

async function mostrar(lista){

    results.innerHTML="";

    if(!lista || lista.length===0){

        results.innerHTML="No se encontraron resultados.";

        return;

    }

    if(lista.length===1){

        copiarID(lista[0].id);

        return;

    }

    for(const movie of lista){

        const detalles=await obtenerDetalles(movie.id);

        const poster=movie.poster_path
            ? `https://image.tmdb.org/t/p/w154${movie.poster_path}`
            : "https://via.placeholder.com/80x120?text=No+Image";
                const tituloOriginal = detalles.original_title || movie.original_title || "";

        const tituloEspanol = detalles.title || movie.title || "";

        const pais = detalles.production_countries.length
            ? detalles.production_countries
                .map(p => p.iso_3166_1)
                .join(", ")
            : "N/D";

        const generos = detalles.genres.length
            ? detalles.genres
                .map(g => g.name)
                .join(" • ")
            : "N/D";

        const div = document.createElement("div");

        div.className = "result";

        div.innerHTML = `

        <div style="
            display:flex;
            gap:15px;
            align-items:flex-start;
        ">

            <img
                src="${poster}"
                alt="${tituloOriginal}"
                style="
                    width:80px;
                    border-radius:8px;
                    flex-shrink:0;
                "
            >

            <div style="
                display:flex;
                flex-direction:column;
                justify-content:center;
                line-height:1.45;
            ">

                <div style="
                    font-size:18px;
                    font-weight:bold;
                ">
                    ${tituloOriginal}
                </div>

                <div style="
                    color:#BEBEBE;
                    margin-bottom:10px;
                ">
                    ${tituloEspanol}
                </div>

                <div>

                    🆔 <b>${movie.id}</b>

                </div>

                <div>

                    🌍 ${pais}

                </div>

                <div>

                    🎭 ${generos}

                </div>

            </div>

        </div>

        `;
                div.addEventListener("click", () => {

            copiarID(movie.id);

        });

        results.appendChild(div);

    }

}
