/* Alei Fernandes Santos — private files

   Decrypts what tools/publish_private.py encrypted. The format is described
   there, and the two files change together:
     /private/vault.json        PBKDF2 parameters + encrypted list of files
     /private/blobs/<id>.bin    AES-256-GCM ciphertext of each file
   The key never leaves this page and is dropped on Lock or reload. */

(function () {
  "use strict";

  var VAULT_URL = "/private/vault.json";
  var BLOB_URL = "/private/blobs/";

  var form = document.getElementById("vault-form");
  var input = document.getElementById("vault-password");
  var statusEl = document.getElementById("vault-status");
  var list = document.getElementById("vault-list");
  var groups = document.getElementById("vault-groups");
  var count = document.getElementById("vault-count");
  var lockBtn = document.getElementById("vault-lock");
  if (!form) return;

  var enc = new TextEncoder();
  var key = null;

  function status(text) {
    statusEl.textContent = text || "";
  }

  function unb64(text) {
    return Uint8Array.from(atob(text), function (c) { return c.charCodeAt(0); });
  }

  function deriveKey(password, kdf) {
    return crypto.subtle
      .importKey("raw", enc.encode(password.normalize("NFC")), "PBKDF2", false, ["deriveKey"])
      .then(function (base) {
        return crypto.subtle.deriveKey(
          { name: "PBKDF2", hash: kdf.hash, salt: unb64(kdf.salt), iterations: kdf.iterations },
          base,
          { name: "AES-GCM", length: 256 },
          false,
          ["decrypt"]
        );
      });
  }

  function decrypt(k, iv, data, label) {
    return crypto.subtle.decrypt(
      { name: "AES-GCM", iv: unb64(iv), additionalData: enc.encode(label) },
      k,
      data
    );
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric"
    });
  }

  function download(file, btn) {
    var name = file.path.split("/").pop();
    btn.disabled = true;
    btn.textContent = "Downloading…";
    status("");
    fetch(BLOB_URL + file.blob + ".bin")
      .then(function (r) {
        if (!r.ok) throw new Error("the file is no longer on the site; reload the page");
        return r.arrayBuffer();
      })
      .then(function (data) { return decrypt(key, file.iv, data, file.blob); })
      .then(function (plain) {
        var url = URL.createObjectURL(new Blob([plain], { type: file.type }));
        var a = document.createElement("a");
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
      })
      .catch(function (err) {
        status("Could not download " + name + ": " + (err.message || "decryption failed") + ".");
      })
      .then(function () {
        btn.disabled = false;
        btn.textContent = "Download";
      });
  }

  /* Files at the top of the folder first, then one block per subfolder. */
  function render(files) {
    var byFolder = {};
    files.forEach(function (f) {
      var cut = f.path.lastIndexOf("/");
      var folder = cut < 0 ? "" : f.path.slice(0, cut);
      (byFolder[folder] = byFolder[folder] || []).push(f);
    });
    var folders = Object.keys(byFolder).sort(function (a, b) {
      return a.localeCompare(b, "en", { sensitivity: "base" });
    });

    groups.textContent = "";
    folders.forEach(function (folder) {
      var section = document.createElement("section");
      section.className = "vault-group";
      if (folder) {
        var h = document.createElement("h2");
        h.textContent = folder;
        section.appendChild(h);
      }
      var ul = document.createElement("ul");
      ul.className = "vault-files";
      byFolder[folder]
        .sort(function (a, b) { return a.path.localeCompare(b.path, "en", { sensitivity: "base" }); })
        .forEach(function (f) {
          var li = document.createElement("li");
          var main = document.createElement("div");
          var nameEl = document.createElement("span");
          var meta = document.createElement("span");
          var btn = document.createElement("button");
          nameEl.className = "vault-name";
          nameEl.textContent = f.path.split("/").pop();
          meta.className = "vault-meta";
          meta.textContent = formatSize(f.size) + " · " + formatDate(f.modified);
          btn.type = "button";
          btn.className = "link-btn";
          btn.textContent = "Download";
          btn.addEventListener("click", function () { download(f, btn); });
          main.appendChild(nameEl);
          main.appendChild(meta);
          li.appendChild(main);
          li.appendChild(btn);
          ul.appendChild(li);
        });
      section.appendChild(ul);
      groups.appendChild(section);
    });

    count.textContent = files.length === 1 ? "1 file" : files.length + " files";
    form.hidden = true;
    list.hidden = false;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!window.crypto || !crypto.subtle) {
      status("This browser cannot decrypt the files. Open the page over https.");
      return;
    }
    var password = input.value;
    var button = form.querySelector("button");
    button.disabled = true;
    status("Opening…");

    fetch(VAULT_URL, { cache: "no-cache" })
      .then(function (r) {
        if (r.status === 404) throw new Error("No files have been published yet.");
        if (!r.ok) throw new Error("Could not load the file list (HTTP " + r.status + ").");
        return r.json();
      })
      .then(function (vault) {
        return deriveKey(password, vault.kdf).then(function (k) {
          return decrypt(k, vault.iv, unb64(vault.data), "manifest")
            .catch(function () { throw new Error("Wrong password."); })
            .then(function (plain) {
              key = k;
              input.value = "";
              status("");
              render(JSON.parse(new TextDecoder().decode(plain)).files);
            });
        });
      })
      .catch(function (err) {
        status(err.message);
        input.select();
      })
      .then(function () { button.disabled = false; });
  });

  lockBtn.addEventListener("click", function () {
    key = null;
    groups.textContent = "";
    list.hidden = true;
    form.hidden = false;
    status("Locked.");
    input.focus();
  });
})();
