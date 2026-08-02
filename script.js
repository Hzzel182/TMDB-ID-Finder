const API_KEY = "0ba50b1a0e817c1f5e8ba94951a3a3c2";

const input = document.getElementById("search");
const buscar = document.getElementById("buscar");
const results = document.getElementById("results");

let timeoutBusqueda = null;

buscar.addEventListener("click", buscarContenido);

input.addEventListener("input", () => {

    clearTimeout(timeoutBusqueda);

    if(input.value.trim()===""){

        results.innerHTML="";

        return;

    }

    timeoutBusqueda=setTimeout(buscarContenido,300);

});

input.addEventListener("keydown",(e)=>{

    if(e.key==="Enter"){

        clearTimeout(timeoutBusqueda);

        buscarContenido();

    }

});

async function buscarContenido(){

    const texto=input.value.trim();

    if(!texto) return;

    results.innerHTML="Buscando...";

    try{

        const response=await fetch(

            `https://api.themoviedb.org/3/search/multi?api_key=${API_KEY}&language=es-MX&query=${encodeURIComponent(texto)}`

        );

        const data=await response.json();

        const resultados=data.results.filter(item=>

            item.media_type==="movie" ||

            item.media_type==="tv"

        );

        await mostrarResultados(resultados);

    }

    catch(error){

        console.error(error);

        results.innerHTML="Error al consultar TMDB.";

    }

}

async function obtenerDetalles(tipo,id){

    const endpoint=tipo==="movie"

        ? "movie"

        : "tv";

    const response=await fetch(

        `https://api.themoviedb.org/3/${endpoint}/${id}?api_key=${API_KEY}&language=es-MX`

    );

    return await response.json();

}

async function copiar(texto){

    try{

        await navigator.clipboard.writeText(texto);

    }

    catch(error){

        console.error(error);

    }

}

function feedbackBoton(boton,textoOriginal){

    boton.style.background="#22c55e";

    boton.style.color="white";

    boton.textContent="✔";

    setTimeout(()=>{

        boton.style.background="";

        boton.style.color="";

        boton.textContent=textoOriginal;

    },500);

}

async function mostrarResultados(lista){

    results.innerHTML="";

    if(lista.length===0){

        results.innerHTML="No se encontraron resultados.";

        return;

    }

    for(const item of lista){

        const detalles=await obtenerDetalles(item.media_type,item.id);

        const poster=item.poster_path

            ? `https://image.tmdb.org/t/p/w154${item.poster_path}`

            : "https://via.placeholder.com/90x135?text=No+Image";
                const tituloOriginal = detalles.original_title ||
                               detalles.original_name ||
                               item.original_title ||
                               item.original_name ||
                               "-";

        const tituloEspanol = detalles.title ||
                              detalles.name ||
                              item.title ||
                              item.name ||
                              "-";

        const pais = detalles.production_countries?.length
            ? detalles.production_countries
                .map(p => p.iso_3166_1)
                .join(", ")
            : detalles.origin_country?.join(", ") || "-";

        const generos = detalles.genres?.length
            ? detalles.genres
                .map(g => g.name)
                .join(" • ")
            : "-";

        const anio = (
            detalles.release_date ||
            detalles.first_air_date ||
            ""
        ).substring(0,4);

        const tipo = item.media_type==="movie"
            ? "Movie"
            : "TV Series";

        const posterOriginal = item.poster_path
            ? `https://image.tmdb.org/t/p/original${item.poster_path}`
            : "";

        const textoCompleto =
`Original: ${tituloOriginal}
Español: ${tituloEspanol}
ID: ${item.id}
País: ${pais}
Géneros: ${generos}
Tipo: ${tipo}`;

        const div=document.createElement("div");

        div.className="result";

        div.innerHTML=`

<div style="
display:flex;
justify-content:space-between;
align-items:flex-start;
gap:18px;
">

<div style="
display:flex;
gap:16px;
flex:1;
">

<a
href="${posterOriginal}"
target="_blank"
title="Abrir portada"
>

<img
src="${poster}"
style="
width:90px;
border-radius:8px;
display:block;
cursor:pointer;
transition:.2s;
"
onmouseover="this.style.transform='scale(1.03)'"
onmouseout="this.style.transform='scale(1)'"
>

</a>

<div style="flex:1;">

<div style="
font-size:18px;
font-weight:700;
">

${tituloOriginal}

${anio ? `(${anio})` : ""}

</div>

<div style="
margin-top:4px;
margin-bottom:10px;
color:#BDBDBD;
">

${tituloEspanol}

</div>

<div>

ID:
<b>${item.id}</b>

</div>

<div>

País:
${pais}

</div>

<div>

Géneros:
${generos}

</div>

<div>

Tipo:
${tipo}

</div>

</div>

</div>

<div
style="
display:flex;
flex-direction:column;
gap:8px;
"
>

<button class="btn-en">EN</button>

<button class="btn-es">ES</button>

<button class="btn-id">ID</button>

<button class="btn-img">IMG</button>

<button class="btn-copy">COPY</button>

</div>

</div>

`;
                const btnEN = div.querySelector(".btn-en");
        const btnES = div.querySelector(".btn-es");
        const btnID = div.querySelector(".btn-id");
        const btnIMG = div.querySelector(".btn-img");
        const btnCOPY = div.querySelector(".btn-copy");

        btnEN.addEventListener("click", async (e)=>{

            e.preventDefault();
            e.stopPropagation();

            await copiar(tituloOriginal);

            feedbackBoton(btnEN,"EN");

        });

        btnES.addEventListener("click", async (e)=>{

            e.preventDefault();
            e.stopPropagation();

            await copiar(tituloEspanol);

            feedbackBoton(btnES,"ES");

        });

        btnID.addEventListener("click", async (e)=>{

            e.preventDefault();
            e.stopPropagation();

            await copiar(String(item.id));

            feedbackBoton(btnID,"ID");

        });

        btnIMG.addEventListener("click", async (e)=>{

            e.preventDefault();
            e.stopPropagation();

            if(posterOriginal){

                await copiar(posterOriginal);

                feedbackBoton(btnIMG,"IMG");

            }

        });

        btnCOPY.addEventListener("click", async (e)=>{

            e.preventDefault();
            e.stopPropagation();

            await copiar(textoCompleto);

            feedbackBoton(btnCOPY,"COPY");

        });

        results.appendChild(div);
        
