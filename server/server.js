const http = require("http");
const fs = require("fs");
const path = require("path");
const pool = require("./db");

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, "..", "public");

// ---- Helpers ----
function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => (data += chunk));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error("JSON inválido"));
      }
    });
  });
}

function serveStatic(req, res) {
  const urlPath = req.url === "/" ? "/registrar.html" : req.url;
  const filePath = path.join(PUBLIC_DIR, urlPath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      return res.end("Not found");
    }

    const ext = path.extname(filePath);
    const type =
      ext === ".html" ? "text/html; charset=utf-8" :
        ext === ".js" ? "text/javascript; charset=utf-8" :
          ext === ".css" ? "text/css; charset=utf-8" :
            "text/plain; charset=utf-8";

    res.writeHead(200, { "Content-Type": type });
    res.end(content);
  });
}

// ---- API ----
async function handleApi(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  // GET /api/grupos
  if (req.method === "GET" && req.url === "/api/grupos") {
    try {
      const [rows] = await pool.query(
        "SELECT id_grupo, nombre_grupo FROM grupo ORDER BY nombre_grupo"
      );
      return sendJson(res, 200, rows);
    } catch {
      return sendJson(res, 500, { error: "Error al listar grupos" });
    }
  }

  // POST /api/productos
  if (req.method === "POST" && req.url === "/api/productos") {
    try {
      const body = await readBody(req);

      const nombre_producto = String(body.nombre_producto ?? "").trim();
      const precio_por_kilo = Number(body.precio_por_kilo);
      const id_grupo = Number(body.id_grupo);

      if (!nombre_producto) {
        return sendJson(res, 400, { error: "Nombre obligatorio." });
      }
      if (!Number.isFinite(precio_por_kilo) || precio_por_kilo <= 0) {
        return sendJson(res, 400, { error: "Precio por kilo debe ser mayor que 0." });
      }
      if (!Number.isInteger(id_grupo) || id_grupo <= 0) {
        return sendJson(res, 400, { error: "Seleccione un grupo válido." });
      }

      await pool.query(
        "INSERT INTO producto (nombre_producto, precio_por_kilo, id_grupo) VALUES (?,?,?)",
        [nombre_producto, precio_por_kilo, id_grupo]
      );

      return sendJson(res, 201, { ok: true, message: "Producto registrado." });
    } catch (e) {
      if (e.code === "ER_DUP_ENTRY") {
        return sendJson(res, 409, { error: "Producto duplicado en el mismo grupo." });
      }
      if (e.code === "ER_NO_REFERENCED_ROW_2") {
        return sendJson(res, 400, { error: "El grupo no existe." });
      }
      return sendJson(res, 500, { error: "Error al registrar producto." });
    }
  }

  // GET /api/productos para listar productos con su grupo
  if (req.method === "GET" && req.url === "/api/productos") {
    try {
      const [rows] = await pool.query(`
      SELECT 
        p.id_producto,
        p.nombre_producto,
        p.precio_por_kilo,
        p.id_grupo,
        g.nombre_grupo
      FROM producto p
      INNER JOIN grupo g ON g.id_grupo = p.id_grupo
      ORDER BY p.id_producto DESC
    `);
      return sendJson(res, 200, rows);
    } catch (e) {
      console.log("ERROR /api/productos:", e.message);
      return sendJson(res, 500, { error: "Error al listar productos" });
    }
  }

  // PUT /api/productos?id= para actualizar producto
  if (req.method === "PUT" && req.url.startsWith("/api/productos")) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const id = Number(url.searchParams.get("id"));

      if (!Number.isInteger(id) || id <= 0) {
        return sendJson(res, 400, { error: "ID de producto inválido." });
      }

      const body = await readBody(req);

      const nombre_producto = String(body.nombre_producto ?? "").trim();
      const precio_por_kilo = Number(body.precio_por_kilo);
      const id_grupo = Number(body.id_grupo);

      if (!nombre_producto) {
        return sendJson(res, 400, { error: "Nombre obligatorio." });
      }
      if (!Number.isFinite(precio_por_kilo) || precio_por_kilo <= 0) {
        return sendJson(res, 400, { error: "Precio por kilo debe ser mayor que 0." });
      }
      if (!Number.isInteger(id_grupo) || id_grupo <= 0) {
        return sendJson(res, 400, { error: "Seleccione un grupo válido." });
      }

      const [result] = await pool.query(
        "UPDATE producto SET nombre_producto = ?, precio_por_kilo = ?, id_grupo = ? WHERE id_producto = ?",
        [nombre_producto, precio_por_kilo, id_grupo, id]
      );

      if (result.affectedRows === 0) {
        return sendJson(res, 404, { error: "Producto no encontrado." });
      }

      return sendJson(res, 200, { ok: true, message: "Producto actualizado." });
    } catch (e) {
      if (e.code === "ER_DUP_ENTRY") {
        return sendJson(res, 409, { error: "Producto duplicado en el mismo grupo." });
      }
      if (e.code === "ER_NO_REFERENCED_ROW_2") {
        return sendJson(res, 400, { error: "El grupo no existe." });
      }
      console.log("ERROR PUT /api/productos:", e.message);
      return sendJson(res, 500, { error: "Error al actualizar producto." });
    }
  }


  return sendJson(res, 404, { error: "Ruta no encontrada" });
}

// ---- Server ----
const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) return handleApi(req, res);
  return serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Servidor listo: http://localhost:${PORT}`);
});
