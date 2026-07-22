"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Search, X, Lock, Wine, Martini, UtensilsCrossed,
  Check, Pencil, Sparkles, LogOut, Camera, ImageOff,
} from "lucide-react";

const COR = {
  vinho: "#6B1D2F", vinhoEsc: "#551625",
  ouro: "#D4AF37", ouroEsc: "#B8942A",
  fundo: "#F8F9FA", texto: "#2B2222",
};

const TABS = [
  { nome: "Cardápio", Icon: UtensilsCrossed },
  { nome: "Vinhos", Icon: Wine },
  { nome: "Drinks & Destilados", Icon: Martini },
];

const brl = (n) =>
  "R$ " + Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Comprime/redimensiona a imagem antes de enviar ao Supabase
function comprimirParaBlob(file, maxW = 900, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const escala = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * escala);
        const h = Math.round(img.height * escala);
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        c.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/jpeg", quality);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ItemCard({ item, adminMode, onToggle, onEditPreco, onAddFoto, onRemoveFoto }) {
  const indisponivel = !item.disponivel;
  return (
    <div className="rounded-xl border overflow-hidden transition-all"
      style={{
        background: "#fff",
        borderColor: indisponivel ? "#E5E0DE" : "rgba(107,29,47,0.10)",
        opacity: indisponivel ? 0.6 : 1,
        boxShadow: "0 1px 2px rgba(43,34,34,0.04)",
      }}>
      {item.foto_url && (
        <div className="w-full" style={{ aspectRatio: "4 / 3", background: "#F1ECEA" }}>
          <img src={item.foto_url} alt={item.nome} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold leading-snug" style={{ color: COR.texto }}>
            {item.nome}
            {indisponivel && (
              <span className="ml-2 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                style={{ background: "#EFE9E7", color: "#8A7F7B" }}>Esgotado</span>
            )}
          </h3>
          <span className="whitespace-nowrap font-bold text-[15px]" style={{ color: COR.ouroEsc }}>
            {brl(item.preco)}
          </span>
        </div>
        {item.descricao && <p className="text-[13px] mt-1" style={{ color: "#7A716D" }}>{item.descricao}</p>}

        {item.harmonizacao && (
          <div className="mt-2.5 flex items-start gap-2 rounded-lg px-2.5 py-2"
            style={{ background: "rgba(212,175,55,0.10)", border: "1px solid rgba(212,175,55,0.35)" }}>
            <Sparkles size={14} className="mt-0.5 shrink-0" style={{ color: COR.ouroEsc }} />
            <p className="text-[12px] leading-snug" style={{ color: "#6B5A2E" }}>
              <span className="font-semibold" style={{ color: COR.vinho }}>Dica do Chef: </span>
              {item.harmonizacao}
            </p>
          </div>
        )}

        {adminMode && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button onClick={onToggle}
              className="text-[12px] font-semibold px-2.5 py-1 rounded-md flex items-center gap-1"
              style={{ background: indisponivel ? "#EAF6EC" : "#FBECEC", color: indisponivel ? "#1E7A3B" : "#9A2B2B" }}>
              {indisponivel ? <><Check size={13} /> Marcar disponível</> : <><X size={13} /> Marcar esgotado</>}
            </button>
            <button onClick={onEditPreco}
              className="text-[12px] font-semibold px-2.5 py-1 rounded-md flex items-center gap-1"
              style={{ background: "#F1EBE9", color: COR.vinho }}>
              <Pencil size={13} /> Editar preço
            </button>
            <button onClick={onAddFoto}
              className="text-[12px] font-semibold px-2.5 py-1 rounded-md flex items-center gap-1"
              style={{ background: "#F1EBE9", color: COR.vinho }}>
              <Camera size={13} /> {item.foto_url ? "Trocar foto" : "Adicionar foto"}
            </button>
            {item.foto_url && (
              <button onClick={onRemoveFoto}
                className="text-[12px] font-semibold px-2.5 py-1 rounded-md flex items-center gap-1"
                style={{ background: "#FBECEC", color: "#9A2B2B" }}>
                <ImageOff size={13} /> Remover foto
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MenuClient() {
  const [produtos, setProdutos] = useState([]);
  const [tab, setTab] = useState("Cardápio");
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [sessao, setSessao] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erroLogin, setErroLogin] = useState("");
  const [salvandoFoto, setSalvandoFoto] = useState(false);

  const pressTimer = useRef(null);
  const inputFotoRef = useRef(null);
  const fotoAlvo = useRef(null);

  const adminMode = !!sessao;

  const carregar = useCallback(async () => {
    setCarregando(true);
    const { data, error } = await supabase
      .from("produtos").select("*").order("ordem", { ascending: true });
    if (error) setErro("Não foi possível carregar o cardápio.");
    else { setProdutos(data || []); setErro(""); }
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
    supabase.auth.getSession().then(({ data }) => setSessao(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s));
    return () => sub.subscription.unsubscribe();
  }, [carregar]);

  // ---- Ações de administrador ----
  const atualizar = async (id, campos) => {
    setProdutos((ps) => ps.map((p) => (p.id === id ? { ...p, ...campos } : p)));
    const { error } = await supabase.from("produtos").update(campos).eq("id", id);
    if (error) { window.alert("Não consegui salvar. Verifique sua conexão/login."); carregar(); }
  };
  const toggleDisp = (item) => atualizar(item.id, { disponivel: !item.disponivel });
  const editarPreco = (item) => {
    const v = window.prompt("Novo preço (somente números). Ex: 42.50", String(item.preco));
    if (v == null) return;
    const num = parseFloat(v.replace(",", "."));
    if (isNaN(num) || num < 0) return;
    atualizar(item.id, { preco: num });
  };

  const escolherFoto = (item) => {
    fotoAlvo.current = item;
    if (inputFotoRef.current) { inputFotoRef.current.value = ""; inputFotoRef.current.click(); }
  };
  const onArquivoFoto = async (e) => {
    const file = e.target.files && e.target.files[0];
    const item = fotoAlvo.current;
    if (!file || !item) return;
    setSalvandoFoto(true);
    try {
      const blob = await comprimirParaBlob(file);
      const path = `${item.id}-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("fotos-produtos").upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("fotos-produtos").getPublicUrl(path);
      await atualizar(item.id, { foto_url: pub.publicUrl });
    } catch (err) {
      console.error(err);
      window.alert("Não consegui enviar a foto. Tente novamente.");
    } finally {
      setSalvandoFoto(false);
      fotoAlvo.current = null;
    }
  };
  const removerFoto = (item) => atualizar(item.id, { foto_url: null });

  // ---- Acesso discreto ----
  const iniciarPress = () => { pressTimer.current = setTimeout(() => setShowLogin(true), 650); };
  const cancelarPress = () => clearTimeout(pressTimer.current);
  const entrar = async () => {
    setErroLogin("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    if (error) setErroLogin("E-mail ou senha incorretos.");
    else { setShowLogin(false); setEmail(""); setSenha(""); }
  };
  const sair = async () => { await supabase.auth.signOut(); };

  // ---- Montagem das seções ----
  const q = busca.trim().toLowerCase();
  const daAba = produtos.filter((p) => p.aba === tab &&
    (!q || p.nome.toLowerCase().includes(q) || (p.descricao || "").toLowerCase().includes(q)));
  const secoes = [];
  for (const p of daAba) {
    let s = secoes.find((x) => x.secao === p.secao);
    if (!s) { s = { secao: p.secao, itens: [] }; secoes.push(s); }
    s.itens.push(p);
  }

  return (
    <div className="min-h-screen w-full flex justify-center" style={{ background: COR.fundo }}>
      <div className="w-full max-w-md relative pb-20" style={{ color: COR.texto }}>

        <header className="px-5 pt-6 pb-6 flex justify-center" style={{ background: COR.vinho }}>
          <img src="/logo.png" alt="Choperia Jacques" className="h-auto" style={{ width: 172 }} />
        </header>

        <input ref={inputFotoRef} type="file" accept="image/*" onChange={onArquivoFoto} className="hidden" />
        {salvandoFoto && (
          <div className="absolute inset-0 z-40 flex items-center justify-center" style={{ background: "rgba(43,34,34,0.35)" }}>
            <div className="rounded-lg px-4 py-2 text-sm font-semibold" style={{ background: "#fff", color: COR.vinho }}>Salvando foto...</div>
          </div>
        )}

        {adminMode && (
          <div className="flex items-center justify-between px-4 py-2 text-[12px] font-semibold" style={{ background: COR.ouro, color: COR.vinhoEsc }}>
            <span className="flex items-center gap-1.5"><Lock size={13} /> Modo administrador ativo</span>
            <button onClick={sair} className="flex items-center gap-1 underline"><LogOut size={13} /> Sair</button>
          </div>
        )}

        <nav className="sticky top-0 z-20 flex" style={{ background: COR.vinho, boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>
          {TABS.map(({ nome, Icon }) => {
            const ativo = tab === nome;
            return (
              <button key={nome} onClick={() => { setTab(nome); setBusca(""); }}
                className="flex-1 py-3 flex flex-col items-center gap-1 transition-colors"
                style={{ color: ativo ? COR.ouro : "rgba(255,255,255,0.65)", borderBottom: ativo ? `3px solid ${COR.ouro}` : "3px solid transparent" }}>
                <Icon size={17} />
                <span className="text-[10px] font-bold uppercase tracking-wide leading-tight text-center px-1">{nome}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-4 pt-4">
          <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "#fff", border: "1px solid rgba(107,29,47,0.15)" }}>
            <Search size={16} style={{ color: "#A99B96" }} />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar no cardápio..."
              className="flex-1 text-sm outline-none bg-transparent" style={{ color: COR.texto }} />
            {busca && <button onClick={() => setBusca("")}><X size={16} style={{ color: "#A99B96" }} /></button>}
          </div>
        </div>

        <main className="px-4 pt-4 space-y-6">
          {tab === "Vinhos" && !carregando && (
            <div className="rounded-lg px-3 py-2.5 text-[12px]" style={{ background: "rgba(107,29,47,0.06)", border: "1px dashed rgba(107,29,47,0.3)", color: COR.vinho }}>
              Carta de vinhos (tintos, brancos e rosés) em breve. Por enquanto, nossos espumantes:
            </div>
          )}
          {carregando ? (
            <p className="text-center text-sm py-10" style={{ color: "#A99B96" }}>Carregando cardápio...</p>
          ) : erro ? (
            <p className="text-center text-sm py-10" style={{ color: "#9A2B2B" }}>{erro}</p>
          ) : secoes.length === 0 ? (
            <p className="text-center text-sm py-10" style={{ color: "#A99B96" }}>Nenhum item encontrado.</p>
          ) : (
            secoes.map((s) => (
              <section key={s.secao}>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-lg font-bold" style={{ fontFamily: "Georgia, serif", color: COR.vinho }}>{s.secao}</h2>
                  <div className="flex-1 h-px" style={{ background: "rgba(212,175,55,0.5)" }} />
                </div>
                <div className="space-y-3">
                  {s.itens.map((item) => (
                    <ItemCard key={item.id} item={item} adminMode={adminMode}
                      onToggle={() => toggleDisp(item)}
                      onEditPreco={() => editarPreco(item)}
                      onAddFoto={() => escolherFoto(item)}
                      onRemoveFoto={() => removerFoto(item)} />
                  ))}
                </div>
              </section>
            ))
          )}
        </main>

        <footer className="text-center px-4 pt-10 pb-6">
          <p className="text-[12px]" style={{ color: "#B4A9A4" }}>
            © Choperia Jacques •{" "}
            <span
              onMouseDown={iniciarPress} onMouseUp={cancelarPress} onMouseLeave={cancelarPress}
              onTouchStart={iniciarPress} onTouchEnd={cancelarPress}
              onDoubleClick={() => setShowLogin(true)}
              className="cursor-default select-none" style={{ color: "#B4A9A4" }}>
              Desde 2013
            </span>
          </p>
        </footer>

        {showLogin && (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-6" style={{ background: "rgba(43,34,34,0.55)" }}>
            <div className="w-full max-w-xs rounded-2xl p-5" style={{ background: "#fff" }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold flex items-center gap-2" style={{ color: COR.vinho }}><Lock size={16} /> Acesso do Gerente</h3>
                <button onClick={() => { setShowLogin(false); setSenha(""); setErroLogin(""); }}><X size={18} style={{ color: "#A99B96" }} /></button>
              </div>
              <input type="email" value={email} autoFocus onChange={(e) => { setEmail(e.target.value); setErroLogin(""); }}
                placeholder="E-mail" className="w-full text-sm rounded-lg px-3 py-2 outline-none mb-2"
                style={{ border: "1px solid rgba(107,29,47,0.25)" }} />
              <input type="password" value={senha} onChange={(e) => { setSenha(e.target.value); setErroLogin(""); }}
                onKeyDown={(e) => e.key === "Enter" && entrar()} placeholder="Senha"
                className="w-full text-sm rounded-lg px-3 py-2 outline-none mb-2"
                style={{ border: `1px solid ${erroLogin ? "#D9534F" : "rgba(107,29,47,0.25)"}` }} />
              {erroLogin && <p className="text-[12px] mb-2" style={{ color: "#D9534F" }}>{erroLogin}</p>}
              <button onClick={entrar} className="w-full py-2 rounded-lg font-semibold text-sm text-white" style={{ background: COR.vinho }}>Entrar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
