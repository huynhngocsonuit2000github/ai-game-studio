import { StrictMode, useEffect, useRef, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import catalog from '../../registry/games.json';
import { developmentCatalog } from './developmentCatalog';
import { parseRegistry, publicGames } from './registry';
import './styles.css';

const releasedGames = publicGames(parseRegistry(catalog));
const games = import.meta.env.DEV
  ? [...releasedGames, ...parseRegistry(developmentCatalog).games]
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
        <div className="container brand">AI Game Studio</div>
      </header>
      <main className="container">
        {!isLibrary && <a className="back-link" href="#/">Back to Game Library</a>}
        <h1 ref={heading} tabIndex={-1}>{title}</h1>
        {isLibrary ? (
          games.length === 0 ? (
            <section className="empty-state" aria-labelledby="empty-title">
              <h2 id="empty-title">No games available yet</h2>
              <p>Released games will appear here.</p>
            </section>
          ) : (
            <ul className="game-list">
              {games.map((item) => (
                <li key={item.id}>
                  <h2><a href={`#/games/${item.id}`}>{item.title}</a></h2>
                  <p>{item.description}</p>
                </li>
              ))}
            </ul>
          )
        ) : game ? (
          <div className="game-detail">
            <p>{game.description}</p>
            {game.entry && <a className="launch-link" href={`./${game.entry}`}>Launch game</a>}
          </div>
        ) : (
          <p>This game is unavailable in the catalog.</p>
        )}
      </main>
    </>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Portal root is missing');

createRoot(root).render(<StrictMode><App /></StrictMode>);
