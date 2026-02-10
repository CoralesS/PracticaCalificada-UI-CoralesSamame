const select_grupo = document.getElementById("select_grupo");
const input_nombre_producto = document.getElementById("input_nombre_producto");
const input_precio_kilo = document.getElementById("input_precio_kilo");
const formulario_registro = document.getElementById("formulario_registro");
const mensaje = document.getElementById("mensaje");

function mostrar_mensaje(texto, es_exito = false) {
  mensaje.textContent = texto;
  mensaje.className = texto ? (es_exito ? "mensaje_exito" : "mensaje_error") : "";
}

async function cargar_grupos() {
  const respuesta = await fetch("/api/grupos");
  const grupos = await respuesta.json();

  select_grupo.innerHTML = '<option value="">Seleccione...</option>';
  grupos.forEach((g) => {
    const opcion = document.createElement("option");
    opcion.value = g.id_grupo;
    opcion.textContent = g.nombre_grupo;
    select_grupo.appendChild(opcion);
  });
}

formulario_registro.addEventListener("submit", async (e) => {
  e.preventDefault();
  mostrar_mensaje("");

  const datos = {
    id_grupo: Number(select_grupo.value),
    nombre_producto: input_nombre_producto.value.trim(),
    precio_por_kilo: Number(input_precio_kilo.value),
  };

  // Validaciones básicas
  if (!datos.id_grupo) return mostrar_mensaje("Seleccione un grupo.");
  if (!datos.nombre_producto) return mostrar_mensaje("Ingrese el nombre del producto.");
  if (!Number.isFinite(datos.precio_por_kilo) || datos.precio_por_kilo <= 0) {
    return mostrar_mensaje("Ingrese un precio válido (mayor que 0).");
  }

  const respuesta = await fetch("/api/productos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });

  const resultado = await respuesta.json();
  if (!respuesta.ok) return mostrar_mensaje(resultado.error || "Error al guardar.");

  mostrar_mensaje("Producto registrado correctamente", true);
  formulario_registro.reset();
  select_grupo.value = "";
});

cargar_grupos().catch(() => mostrar_mensaje("No se pudieron cargar los grupos."));
