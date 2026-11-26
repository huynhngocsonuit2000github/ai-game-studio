import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import catalog from '../../registry/games.json';
import { parseRegistry, publicGames } from './registry';
import './styles.css';

const games = publicGames(parseRegistry(catalog));

function App() {
  return (
    <>
      <header className="site-header">
        <div className="container brand">AI Game Studio</div>
      </header>
      <main className="container">
        <h1>Game Library</h1>
        {games.length === 0 ? (
          <section className="empty-state" aria-labelledby="empty-title">
            <h2 id="empty-title">No games available yet</h2>
            <p>Released games will appear here.</p>
          </section>
        ) : (
          <ul className="game-list">
            {games.map((game) => (
              <li key={game.id}>
                <h2>{game.title}</h2>
                <p>{game.description}</p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Portal root is missing');

createRoot(root).render(<StrictMode><App /></StrictMode>);
