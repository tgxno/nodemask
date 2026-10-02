var campoIp = document.getElementById("ip");
var selPrefijo = document.getElementById("prefijo");
var selNuevo = document.getElementById("nuevo");
var textoError = document.getElementById("error");
var actual = { red: 0, prefijo: 0 };

function ipANumero(texto) {
  var partes = texto.split(".");
  if (partes.length != 4) {
    return null;
  }
  var numero = 0;
  for (var i = 0; i < 4; i++) {
    if (!/^\d{1,3}$/.test(partes[i])) {
      return null;
    }
    var valor = parseInt(partes[i], 10);
    if (valor > 255) {
      return null;
    }
    numero = numero * 256 + valor;
  }
  return numero;
}

function numeroAIp(n) {
  var o1 = Math.floor(n / 16777216) % 256;
  var o2 = Math.floor(n / 65536) % 256;
  var o3 = Math.floor(n / 256) % 256;
  var o4 = n % 256;
  return o1 + "." + o2 + "." + o3 + "." + o4;
}

function mascaraDe(prefijo) {
  if (prefijo == 0) {
    return 0;
  }
  return (0xFFFFFFFF << (32 - prefijo)) >>> 0;
}

function llenarPrefijos() {
  var html = "";
  for (var p = 0; p <= 32; p++) {
    html += '<option value="' + p + '">/' + p + "  " + numeroAIp(mascaraDe(p)) + "</option>";
  }
  selPrefijo.innerHTML = html;
  selPrefijo.value = "24";
}

function mostrarError(mensaje) {
  textoError.textContent = mensaje;
  document.getElementById("resultado").hidden = true;
}

function clasificar(ip) {
  var a = Math.floor(ip / 16777216);
  var b = Math.floor(ip / 65536) % 256;
  var clase = "E";
  if (a < 128) { clase = "A"; }
  else if (a < 192) { clase = "B"; }
  else if (a < 224) { clase = "C"; }
  else if (a < 240) { clase = "D"; }

  var tipo = "Pública";
  if (a == 10) { tipo = "Privada"; }
  else if (a == 172 && b >= 16 && b <= 31) { tipo = "Privada"; }
  else if (a == 192 && b == 168) { tipo = "Privada"; }
  else if (a == 127) { tipo = "Loopback"; }
  else if (a == 169 && b == 254) { tipo = "APIPA (link-local)"; }
  else if (a >= 224 && a <= 239) { tipo = "Multicast"; }
  else if (a >= 240) { tipo = "Reservada"; }
  return { clase: clase, tipo: tipo };
}

function binario(n) {
  var texto = n.toString(2);
  while (texto.length < 32) {
    texto = "0" + texto;
  }
  return texto;
}

function dibujarBits(red, prefijo) {
  var bits = binario(red);
  var html = "";
  for (var o = 0; o < 4; o++) {
    html += '<div class="octeto">';
    for (var i = 0; i < 8; i++) {
      var pos = o * 8 + i;
      var clase = pos < prefijo ? "n" : "h";
      html += '<span class="' + clase + '">' + bits.charAt(pos) + "</span>";
    }
    html += "</div>";
  }
  document.getElementById("bits").innerHTML = html;
}

function dibujarDatos(ip, red, broadcast, prefijo) {
  var total = Math.pow(2, 32 - prefijo);
  var mascara = mascaraDe(prefijo);
  var wildcard = (~mascara) >>> 0;
  var primero = red + 1;
  var ultimo = broadcast - 1;
  var hosts = total - 2;

  if (prefijo == 31) {
    primero = red; ultimo = broadcast; hosts = 2;
  } else if (prefijo == 32) {
    primero = ip; ultimo = ip; hosts = 1;
  }

  var info = clasificar(ip);
  var lista = [
    ["Dirección de red", numeroAIp(red) + "/" + prefijo, true],
    ["Broadcast", numeroAIp(broadcast), true],
    ["Primer host", numeroAIp(primero), true],
    ["Último host", numeroAIp(ultimo), true],
    ["Máscara", numeroAIp(mascara), false],
    ["Wildcard", numeroAIp(wildcard), false],
    ["Hosts utilizables", hosts.toLocaleString("es-PA"), false],
    ["Total de direcciones", total.toLocaleString("es-PA"), false],
    ["Clase", info.clase, false],
    ["Tipo", info.tipo, false]
  ];

  var html = "";
  for (var i = 0; i < lista.length; i++) {
    var extra = lista[i][2] ? " dest" : "";
    html += '<div class="dato' + extra + '"><small>' + lista[i][0] + "</small><b>" + lista[i][1] + "</b></div>";
  }
  document.getElementById("datos").innerHTML = html;
}

function llenarNuevo(prefijo) {
  var bloque = document.getElementById("bloque-split");
  if (prefijo >= 30) {
    bloque.hidden = true;
    return;
  }
  bloque.hidden = false;
  var html = "";
  for (var p = prefijo + 1; p <= 30; p++) {
    html += '<option value="' + p + '">/' + p + "</option>";
  }
  selNuevo.innerHTML = html;
  if (prefijo + 2 <= 30) {
    selNuevo.value = String(prefijo + 2);
  }
}

function dibujarSubredes() {
  var nuevo = parseInt(selNuevo.value, 10);
  var paso = Math.pow(2, 32 - nuevo);
  var cantidad = Math.pow(2, nuevo - actual.prefijo);
  var mostrar = Math.min(cantidad, 32);
  var html = "";

  for (var i = 0; i < mostrar; i++) {
    var inicio = actual.red + i * paso;
    var fin = inicio + paso - 1;
    html += '<div class="fila"><span class="num">' + (i + 1) + "</span><div><b>" +
      numeroAIp(inicio) + "/" + nuevo + "</b><small>" +
      numeroAIp(inicio + 1) + " - " + numeroAIp(fin - 1) + "</small></div>" +
      '<span class="bc">' + numeroAIp(fin) + "</span></div>";
  }
  document.getElementById("tabla").innerHTML = html;
  document.getElementById("nota").textContent =
    "Total: " + cantidad.toLocaleString("es-PA") + " subredes de " +
    (paso - 2).toLocaleString("es-PA") + " hosts. Se muestran " + mostrar + ".";
}

function calcular() {
  textoError.textContent = "";
  var texto = campoIp.value.trim();
  var prefijo = parseInt(selPrefijo.value, 10);

  if (texto.indexOf("/") != -1) {
    var partes = texto.split("/");
    texto = partes[0].trim();
    var nuevoPrefijo = parseInt(partes[1], 10);
    if (isNaN(nuevoPrefijo) || nuevoPrefijo < 0 || nuevoPrefijo > 32) {
      mostrarError("El prefijo debe estar entre 0 y 32.");
      return;
    }
    prefijo = nuevoPrefijo;
    selPrefijo.value = String(prefijo);
    campoIp.value = texto;
  }

  var ip = ipANumero(texto);
  if (ip === null) {
    mostrarError("Dirección IP no válida. Usa el formato 192.168.1.10");
    return;
  }

  var mascara = mascaraDe(prefijo);
  var red = (ip & mascara) >>> 0;
  var broadcast = (red | (~mascara >>> 0)) >>> 0;
  actual.red = red;
  actual.prefijo = prefijo;

  dibujarBits(red, prefijo);
  dibujarDatos(ip, red, broadcast, prefijo);
  llenarNuevo(prefijo);
  if (prefijo < 30) {
    dibujarSubredes();
  }
  document.getElementById("resultado").hidden = false;
}

function limpiar() {
  campoIp.value = "";
  selPrefijo.value = "24";
  textoError.textContent = "";
  document.getElementById("resultado").hidden = true;
}

llenarPrefijos();
document.getElementById("calcular").onclick = calcular;
document.getElementById("limpiar").onclick = limpiar;
selNuevo.onchange = dibujarSubredes;
campoIp.onkeydown = function (evento) {
  if (evento.key == "Enter") {
    calcular();
  }
};

var botones = document.querySelectorAll("#ejemplos button");
for (var i = 0; i < botones.length; i++) {
  botones[i].onclick = function () {
    campoIp.value = this.getAttribute("data-v");
    calcular();
  };
}