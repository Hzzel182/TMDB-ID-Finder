const API_KEY = "0ba50b1a0e817c1f5e8ba94951a3a3c2";

const buscar = document.getElementById("buscar");
const input = document.getElementById("search");
const results = document.getElementById("results");

let timeoutBusqueda;

// El botón sigue funcionando por si quieres usarlo
buscar.addEventListener("click", buscarPelicula);

// Buscar automáticamente mientras escribes
input.addEventListener("input", () => {

    clearTimeout(timeoutBusqueda);

    if(input.value.trim()===""){
        results.innerHTML="";
        return;
    }

    timeoutBusqueda = setTimeout(buscarPelicula,300);

});

// Enter busca inmediatamente
input.addEventListener("keydown",(e)=>{

    if(e.key==="Enter"){

        clearTimeout(timeoutBusqueda);

        buscarPelicula();

    }

});

async function buscarPelicula(){

    const texto=input.value.trim();

    if(!texto) return;

    results.innerHTML="Buscando...";

    const url=`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(texto)}`;

    try{

        const response=await fetch(url);

        const data=await response.json();

        mostrar(data.results);

    }
    catch(error){

        console.error(error);

        results.innerHTML="Error al consultar TMDB.";

    }

}

async function copiarID(id){

    try{

        await navigator.clipboard.writeText(String(id));

    }catch(e){

        console.error(e);

    }

    results.innerHTML="";

    input.value="";

    input.focus();

}

function mostrar(lista){

    results.innerHTML="";

    if(!lista || lista.length===0){

        results.innerHTML="No se encontraron resultados.";

        return;

    }

    // Si solo encontró una película, copiar automáticamente.
    if(lista.length===1){

        copiarID(lista[0].id);

        return;

    }

    lista.forEach(movie=>{

        const poster=movie.poster_path
            ? `https://image.tmdb.org/t/p/w154${movie.poster_path}`
            : "https://via.placeholder.com/70x105?text=No+Image";

        const div=document.createElement("div");

        div.className="result";

        div.innerHTML=`

            <div style="
                display:flex;
                align-items:center;
                gap:15px;
            ">

                <img
                    src="${poster}"
                    alt="${movie.title}"
                    style="
                        width:70px;
                        border-radius:6px;
                        flex-shrink:0;
                    "
                >

                <div>

                    <strong>${movie.title}</strong><br>

                    ${movie.release_date || "Sin fecha"}<br>

                    TMDB ID: <strong>${movie.id}</strong>

                </div>

            </div>

        `;

        div.addEventListener("click",()=>copiarID(movie.id));

        results.appendChild(div);

    });

}
