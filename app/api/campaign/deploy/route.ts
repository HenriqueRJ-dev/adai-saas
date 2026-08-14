// Resolve o link do Instagram para o media ID usando oEmbed (não depende
    // de permissao de listagem, so precisa de um access token de app valido)
    let sourceMediaId: string | null = null;

    if (instagramPostUrl && igBusinessId) {
      const oembedUrl = new URL("https://graph.facebook.com/v21.0/instagram_oembed");
      oembedUrl.searchParams.set("url", instagramPostUrl);
      oembedUrl.searchParams.set("fields", "media_id");
      oembedUrl.searchParams.set("access_token", accessToken);

      const oembedRes = await fetch(oembedUrl.toString());
      const oembedData = await oembedRes.json();
      console.log("DEBUG oembed:", JSON.stringify(oembedData));

      if (!oembedData.media_id) {
        return NextResponse.json(
          {
            error: "instagram_post_not_found",
            message: "Não encontrei essa publicação. Verifique se o link está correto e se o post é público.",
            details: oembedData.error,
          },
          { status: 400 }
        );
      }

      sourceMediaId = oembedData.media_id;
    } else if (instagramPostUrl && !igBusinessId) {
      return NextResponse.json(
        {
          error: "instagram_not_linked",
          message: "A Pagina do Facebook conectada nao tem uma conta do Instagram profissional vinculada, ou falta permissao. Reconecte o Meta e tente novamente.",
        },
        { status: 400 }
      );
    }
