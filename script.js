const API_KEY = "0ba50b1a0e817c1f5e8ba94951a3a3c2";

const buscar = document.getElementById("buscar");
const input = document.getElementById("search");
const results = document.getElementById("results");

let timeoutBusqueda;

buscar.addEventListener("click", buscarPeliculas);

input.addEventListener("input", () => {

    clearTimeout(timeoutBusqueda);

    if(input.value.trim()===""){

        results.innerHTML="";

        return;

    }

    timeoutBusqueda=setTimeout(buscarPeliculas,300);

});

input.addEventListener("keydown",(e)=>{

    if(e.key==="Enter"){

        clearTimeout(timeoutBusqueda);

        buscarPeliculas();

    }

});

async function buscarPeliculas(){

    const texto=input.value.trim();

    if(!texto) return;

    results.innerHTML="Buscando...";

    try{

        const response=await fetch(

            `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(texto)}&language=es-MX`

        );

        const data=await response.json();

        mostrarResultados(data.results);

    }

    catch(error){

        console.error(error);

        results.innerHTML="Error al consultar TMDB.";

    }

}

async function obtenerDetalles(id){

    const response=await fetch(

        `https://api.themoviedb.org/3/movie/${id}?api_key=${API_KEY}&language=es-MX`

    );

    return await response.json();

}

async function copiar(texto){

    try{

        await navigator.clipboard.writeText(texto);

    }

    catch(e){

        console.error(e);

    }

}

function limpiar(){

    results.innerHTML="";

    input.value="";

    input.focus();

}

async function mostrarResultados(lista){

    results.innerHTML="";

    if(!lista || lista.length===0){

        results.innerHTML="No se encontraron resultados.";

        return;

    }

    for(const movie of lista){

        const detalles=await obtenerDetalles(movie.id);

        const poster=movie.poster_path
            ? `https://image.tmdb.org/t/p/w154${movie.poster_path}`
            : `https://via.placeholder.com/80x120?text=No+Image`;
                const tituloOriginal = detalles.original_title || movie.original_title || movie.title;

        const tituloEspanol = detalles.title || movie.title;

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

        const div=document.createElement("div");

        div.className="result";

        div.innerHTML=`

        <div style="
            display:flex;
            justify-content:space-between;
            align-items:flex-start;
            gap:16px;
        ">

            <div style="
                display:flex;
                gap:15px;
                flex:1;
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

                <div>

                    <div style="
                        font-size:18px;
                        font-weight:bold;
                    ">
                        ${tituloOriginal}
                    </div>

                    <div style="
                        color:#BDBDBD;
                        margin-bottom:8px;
                    ">
                        ${tituloEspanol}
                    </div>

                    <div>🆔 <b>${movie.id}</b></div>

                    <div>🌍 ${pais}</div>

                    <div>🎭 ${generos}</div>

                </div>

            </div>

            <div style="
                display:flex;
                flex-direction:column;
                gap:8px;
            ">

                <button class="copy-original"
                    data-text="${tituloOriginal}"
                    style="
                        width:42px;
                        height:42px;
                        cursor:pointer;
                    ">
                    🇺🇸
                </button>

                <button class="copy-spanish"
                    data-text="${tituloEspanol}"
                    style="
                        width:42px;
                        height:42px;
                        cursor:pointer;
                    ">
                    🇲🇽
                </button>

                <button class="copy-id"
                    data-text="${movie.id}"
                    style="
                        width:42px;
                        height:42px;
                        cursor:pointer;
                    ">
                    🆔
                </button>

            </div>

        </div>

        `;
                const btnOriginal = div.querySelector(".copy-original");
        const btnSpanish = div.querySelector(".copy-spanish");
        const btnID = div.querySelector(".copy-id");

        btnOriginal.addEventListener("click", async (e) => {

            e.stopPropagation();

            await copiar(tituloOriginal);

            limpiar();

        });

        btnSpanish.addEventListener("click", async (e) => {

            e.stopPropagation();

            await copiar(tituloEspanol);

            limpiar();

        });

        btnID.addEventListener("click", async (e) => {

            e.stopPropagation();

            await copiar(String(movie.id));

            limpiar();

        });

        results.appendChild(div);

    }

}
