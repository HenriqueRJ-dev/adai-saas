// Resolve o link do Instagram para o media ID, se foi enviado e a conta foi encontrada
    let sourceMediaId: string | null = null;

    if (instagramPostUrl && igBusinessId) {
      const mediaListRes = await fetch(
        `https://graph.facebook.com/v21.0/${igBusinessId}/media?fields=id,permalink&limit=50&access_token=${accessToken}`
      );
      const mediaListData = await mediaListRes.json();
      console.log("DEBUG instagram media:", JSON.stringify(mediaListData));

      const normalizedInput = instagramPostUrl.split("?")[0].replace(/\/$/, "");
      const match = mediaListData.data?.find(
        (m: any) => m.permalink?.replace(/\/$/, "") === normalizedInput
      );

      if (!match) {
        return NextResponse.json(
          {
            error: "instagram_post_not_found",
            message: "Não encontrei essa publicação na conta do Instagram conectada. Verifique o link.",
          },
          { status: 400 }
        );
      }

      sourceMediaId = match.id;
    } else if (instagramPostUrl && !igBusinessId) {
      return NextResponse.json(
        {
          error: "instagram_not_linked",
          message: "A Pagina do Facebook conectada nao tem uma conta do Instagram profissional vinculada, ou falta permissao. Reconecte o Meta e tente novamente.",
        },
        { status: 400 }
      );
    }
