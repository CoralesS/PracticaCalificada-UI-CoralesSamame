const cuerpo_tabla_productos = document.getElementById("cuerpo_tabla_productos");
const mensaje_listado = document.getElementById("mensaje_listado");

const input_id_producto = document.getElementById("input_id_producto");
const select_grupo_edicion = document.getElementById("select_grupo_edicion");
const input_nombre_edicion = document.getElementById("input_nombre_edicion");
const input_precio_edicion = document.getElementById("input_precio_edicion");
const formulario_edicion = document.getElementById("formulario_edicion");
const boton_cancelar = document.getElementById("boton_cancelar");

function mostrar_mensaje_listado(texto, es_exito = false) {
  mensaje_listado.textContent = texto;
  mensaje_listado.className = texto ? (es_exito ? "mensaje_exito" : "mensaje_error") : "";
}

function escapar_html(texto) {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function cargar_grupos_edicion() {
  const respuesta = await fetch("/api/grupos");
  const grupos = await respuesta.json();

  select_grupo_edicion.innerHTML = '<option value="">Seleccione...</option>';
  grupos.forEach((g) => {
    const opcion = document.createElement("option");
    opcion.value = g.id_grupo;
    opcion.textContent = g.nombre_grupo;
    select_grupo_edicion.appendChild(opcion);
  });
}

async function listar_productos() {
  const respuesta = await fetch("/api/productos");
  const productos = await respuesta.json();

  if (!respuesta.ok) return mostrar_mensaje_listado(productos.error || "Error al listar.");

  if (productos.length === 0) {
    cuerpo_tabla_productos.innerHTML = `<tr><td colspan="5">No hay productos registrados.</td></tr>`;
    return;
  }

  cuerpo_tabla_productos.innerHTML = productos.map((p) => `
    <tr>
      <td>${p.id_producto}</td>
      <td>${escapar_html(p.nombre_producto)}</td>
      <td>${escapar_html(p.nombre_grupo)}</td>
      <td>S/ ${Number(p.precio_por_kilo).toFixed(2)}</td>
      <td>
        <button class="boton_editar"
          data-id="${p.id_producto}"
          data-id_grupo="${p.id_grupo}"
          data-nombre="${escapar_html(p.nombre_producto)}"
          data-precio="${p.precio_por_kilo}">
          Editar
        </button>
      </td>
    </tr>
  `).join("");
}

cuerpo_tabla_productos.addEventListener("click", (e) => {
  const boton = e.target.closest("button");
  if (!boton) return;

  input_id_producto.value = boton.dataset.id;
  select_grupo_edicion.value = boton.dataset.id_grupo;
  input_nombre_edicion.value = boton.dataset.nombre;
  input_precio_edicion.value = boton.dataset.precio;

  mostrar_mensaje_listado(`Editando producto #${input_id_producto.value}`, true);
  window.scrollTo({ top: 0, behavior: "smooth" });
});

boton_cancelar.addEventListener("click", () => {
  input_id_producto.value = "";
  formulario_edicion.reset();
  mostrar_mensaje_listado("");
});

formulario_edicion.addEventListener("submit", async (e) => {
  e.preventDefault();
  mostrar_mensaje_listado("");

  const id = Number(input_id_producto.value);
  if (!id) return mostrar_mensaje_listado("Seleccione un producto (clic en Editar).");

  const datos = {
    id_grupo: Number(select_grupo_edicion.value),
    nombre_producto: input_nombre_edicion.value.trim(),
    precio_por_kilo: Number(input_precio_edicion.value),
  };

  if (!datos.id_grupo) return mostrar_mensaje_listado("Seleccione un grupo.");
  if (!datos.nombre_producto) return mostrar_mensaje_listado("Ingrese el nombre.");
  if (!Number.isFinite(datos.precio_por_kilo) || datos.precio_por_kilo <= 0) {
    return mostrar_mensaje_listado("Ingrese un precio válido (mayor que 0).");
  }

  const respuesta = await fetch(`/api/productos?id=${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });

  const resultado = await respuesta.json();
  if (!respuesta.ok) return mostrar_mensaje_listado(resultado.error || "Error al actualizar.");

  mostrar_mensaje_listado("✅ Producto actualizado", true);
  boton_cancelar.click();
  listar_productos();
});

(async function iniciar() {
  try {
    await cargar_grupos_edicion();
    await listar_productos();
  } catch {
    mostrar_mensaje_listado("No se pudo cargar el listado.");
  }
})();
