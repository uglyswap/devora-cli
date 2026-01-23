# PLAN: Intégration OpenRouter dans Devora CLI

## Objectifs du projet

Permettre aux utilisateurs de Devora CLI d'utiliser n'importe quel modèle disponible sur OpenRouter, avec une configuration indépendante des MCP servers Zai.

## Spécifications fonctionnelles

### 1. Configuration OpenRouter

**Variables d'environnement et settings :**
- `OPENROUTER_API_KEY` : Clé API OpenRouter (indépendante de ZAI_API_KEY)
- `openrouterApiKey` dans settings.json
- `openrouter.model` dans settings.json

**Important :** La clé OpenRouter NE doit PAS affecter les MCP servers Zai. Les MCP gardent leur configuration Zai existante.

### 2. Commande `/openrouter`

**Sous-commandes :**

1. **`/openrouter apikey`**
   - Demande et enregistre la clé API OpenRouter
   - Affiche la clé actuelle si déjà configurée
   - Ne modifie PAS les MCP servers

2. **`/openrouter model`**
   - Liste tous les modèles disponibles (via API OpenRouter)
   - Permet de sélectionner un modèle
   - Affiche le modèle actuel
   - Les modèles sont récupérés dynamiquement depuis l'API OpenRouter

3. **`/openrouter status`**
   - Affiche la configuration actuelle :
     - Clé API (masquée partiellement)
     - Modèle sélectionné
     - Nombre de modèles disponibles

**Par défaut :** La commande `/openrouter` affiche le status.

### 3. API OpenRouter

**Endpoint pour récupérer les modèles :**
```
GET https://openrouter.ai/api/v1/models
```

**Réponse attendue :**
```json
{
  "data": [
    {
      "id": "anthropic/claude-3.5-sonnet",
      "name": "Claude 3.5 Sonnet",
      "description": "High-end model",
      "context_length": 200000,
      "pricing": { "prompt": 0.000003, "completion": 0.000015 }
    }
    // ... autres modèles
  ]
}
```

### 4. Intégration dans contentGenerator

**Nouveau AuthType :**
```typescript
OPENROUTER = 'openrouter'
```

**Configuration indépendante :**
```typescript
if (authType === AuthType.OPENROUTER) {
  return new LoggingContentGenerator(
    new OpenRouterContentGenerator(config.apiKey, gcConfig, sessionId),
    gcConfig,
  );
}
```

**Récupération de la clé :**
```typescript
const openrouterApiKey = process.env['OPENROUTER_API_KEY'] || settings.openrouterApiKey;
```

## Architecture technique

### Fichiers à créer

1. **`packages/core/src/openrouter/types.ts`**
   - `OpenRouterMessage` : interface pour les messages
   - `OpenRouterChatRequest` : interface pour les requêtes
   - `OpenRouterChatResponse` : interface pour les réponses
   - `OpenRouterModel` : interface pour les modèles
   - `OpenRouterModelsResponse` : réponse de l'API models

2. **`packages/core/src/openrouter/OpenRouterClient.ts`**
   - Client OpenRouter utilisant OpenAI SDK avec base URL personnalisée
   - Méthodes : `chat()`, `streamChat()`, `embeddings()`
   - Méthode `getModels()` pour récupérer la liste des modèles
   - Base URL : `https://openrouter.ai/api/v1`

3. **`packages/core/src/openrouter/OpenRouterContentGenerator.ts`**
   - Implémente l'interface `ContentGenerator`
   - Adapte les réponses OpenRouter au format Gemini
   - Gère la configuration du modèle (défaut: `anthropic/claude-3.5-sonnet`)

4. **`packages/core/src/openrouter/index.ts`**
   - Export public du module OpenRouter

5. **`packages/cli/src/ui/commands/openrouterCommand.ts`**
   - Commande slash `/openrouter` avec sous-commandes
   - Liste dynamique des modèles via API OpenRouter
   - Configuration indépendante des MCP

### Fichiers à modifier

1. **`packages/core/src/core/contentGenerator.ts`**
   - Ajouter `OPENROUTER` à l'enum `AuthType`
   - Ajouter la gestion de `OPENROUTER_API_KEY`
   - Ajouter le cas `OPENROUTER` dans `createContentGenerator()`

2. **`packages/core/src/config/firstRunSetup.ts`**
   - Ne PAS modifier (OpenRouter est optionnel)
   - Les MCP restent configurés avec Zai uniquement

3. **`packages/cli/src/ui/commands/types.ts`**
   - Si nécessaire, pour les types de commandes

4. **`packages/core/src/index.ts`**
   - Exporter le module OpenRouter

## Comportement détaillé

### Premier lancement

L'utilisateur peut choisir entre :
1. Zai (par défaut) - configure ZAI_API_KEY + MCP
2. OpenRouter (optionnel) - configure OPENROUTER_API_KEY uniquement
3. Les deux - configurer les deux clés

### Changement de provider

La configuration déterminera quel provider utiliser :
- ZAI_API_KEY présent → utilise Zai
- OPENROUTER_API_KEY présent → utilise OpenRouter
- Les deux → priorité configurable

### Indépendance des MCP

**Les MCP servers utilisent TOUJOURS ZAI_API_KEY :**
```typescript
// MCP config reste inchangée
mcpServers: {
  'zai-vision': { env: { Z_AI_API_KEY: zaiApiKey } },
  'zai-web-reader': { headers: { Authorization: `Bearer ${zaiApiKey}` } },
  // ...
}
```

**OpenRouter n'a PAS accès aux MCP :**
- Les MCP sont des outils side-car
- Ils restent liés à Zai uniquement
- OpenRouter est uniquement pour la génération de contenu

## Sécurité

1. **Validation des clés API :**
   - Longueur minimale : 40 caractères (OpenRouter)
   - Format attendu : `sk-or-v1-...`

2. **Masquage des clés :**
   - Affichage : `sk-or-v1-xxxx...xxxx` (seuls les 4 premiers et 4 derniers caractères)

3. **Storage sécurisé :**
   - Clés stockées dans settings.json
   - Jamais dans le code

## Tests manuels à effectuer

1. **Configuration :**
   - [ ] `/openrouter apikey` - configurer une clé
   - [ ] `/openrouter model` - lister et choisir un modèle
   - [ ] `/openrouter status` - vérifier la configuration

2. **Génération de contenu :**
   - [ ] Conversation simple avec un modèle OpenRouter
   - [ ] Streaming response
   - [ ] Long context

3. **Indépendance MCP :**
   - [ ] Vérifier que les MCP utilisent toujours ZAI_API_KEY
   - [ ] Changer OPENROUTER_API_KEY ne change pas les MCP

4. **Switch providers :**
   - [ ] Passer de Zai à OpenRouter
   - [ ] Passer d'OpenRouter à Zai

## Risques et mitigations

| Risque | Mitigation |
|--------|------------|
| API OpenRouter down | Gérer les erreurs de réseau gracieusement |
| Modèle indisponible | Fallback sur un modèle par défaut |
| Clé invalide | Message d'erreur clair avec instructions |
| Conflit de clés | Séparation claire des settings (zaiApiKey vs openrouterApiKey) |

## Livrables

1. Code complet pour l'intégration OpenRouter
2. Tests manuels validés
3. Documentation utilisateur (mise à jour README si nécessaire)
4. Configuration par défaut : modèle Claude 3.5 Sonnet

## Contraintes

- **PAS d'authentification Google** - OpenRouter uniquement
- **MCP indépendants** - OpenRouter ne modifie pas les MCP Zai
- **Rétro-compatibilité** - Zai continue de fonctionner
- **Tous les modèles** - Liste dynamique depuis l'API OpenRouter
