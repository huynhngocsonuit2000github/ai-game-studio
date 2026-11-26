import { StrictMode, useEffect, useRef, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { developmentCatalog } from './developmentCatalog';
import { GameArt, GameStatus, Library } from './library';
import { parseRegistry } from './registry';
import './styles.css';

const releasedGames = __STUDIO_PUBLIC_GAMES__;
const canonicalPreviews = __STUDIO_DEVELOPMENT_GAMES__;
const games = import.meta.env.DEV
  ? [...releasedGames, ...canonicalPreviews, ...parseRegistry(developmentCatalog).games.filter(
    (fixture) => ![...releasedGames, ...canonicalPreviews].some(({ id }) => id === fixture.id),
  )]
  : releasedGames;

function subscribeToRoute(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

function readRoute() {
  return window.location.hash || '#/';
}

function App() {
  const route = useSyncExternalStore(subscribeToRoute, readRoute);
  const game = games.find(({ id }) => route === `#/games/${id}`);
  const isLibrary = route === '#/';
  const title = isLibrary ? 'Game Library' : game?.title ?? 'Game not found';
  const heading = useRef<HTMLHeadingElement>(null);
  const previousRoute = useRef(route);

  useEffect(() => {
    document.title = `${title} | AI Game Studio`;
    if (previousRoute.current !== route) {
      heading.current?.focus();
      previousRoute.current = route;
    }
  }, [route, title]);

  return (
    <>
      <header className="site-header">
        <div className="container header-content">
          <a className="brand" href="#/" aria-label="AI Game Studio home"><span className="brand-mark" aria-hidden="true">A</span>AI Game Studio</a>
          <nav aria-label="Primary"><a href="#/" aria-current={isLibrary ? 'page' : undefined}>Library</a></nav>
          {import.meta.env.DEV && <span className="preview-label">Development preview</span>}
        </div>
      </header>
      <main className="container">
        {isLibrary ? (
          <>
            <h1 ref={heading} tabIndex={-1}>{title}</h1>
            <Library games={games} />
          </>
        ) : (
          <>
            <a className="back-link" href="#/"><span aria-hidden="true">←</span> Back to Game Library</a>
            {game && <GameArt game={game} className="detail-art" />}
            <div className="detail-content">
              {game && <GameStatus game={game} />}
              <h1 ref={heading} tabIndex={-1}>{title}</h1>
              {game ? (
                <>
                  <p className="detail-description">{game.description}</p>
                  <dl className="detail-metadata">
                    {game.dimension && <div><dt>Format</dt><dd>{game.dimension}</dd></div>}
                    {!!game.categories?.length && <div><dt>Categories</dt><dd>{game.categories.join(', ')}</dd></div>}
                    <div><dt>Version</dt><dd>{game.version}</dd></div>
                    {game.milestone && <div><dt>Milestone</dt><dd>{game.milestone}</dd></div>}
                  </dl>
                  {game.entry ? (
                    <a className="primary-button" href={`./${game.entry}`}>
                      <span className="play-icon" aria-hidden="true" /> {game.status === 'released' ? 'Play Now' : 'Play preview'}
                    </a>
                  ) : <p>No playable build is available yet.</p>}
                </>
              ) : <p>This game is unavailable in the catalog.</p>}
            </div>
          </>
        )}
      </main>
    </>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Portal root is missing');

createRoot(root).render(<StrictMode><App /></StrictMode>);
