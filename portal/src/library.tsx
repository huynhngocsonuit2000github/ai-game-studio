import { useState } from 'react';
import type { parseRegistry } from './registry';

export type Game = ReturnType<typeof parseRegistry>['games'][number];
type DimensionFilter = 'All' | '2D' | '3D';

export function GameArt({ game, className }: { game: Game; className: string }) {
  return (
    <div className={`game-art ${className}`} aria-hidden="true">
      {game.cover !== null && <img src={`./${game.cover}`} alt="" onError={(event) => { event.currentTarget.hidden = true; }} />}
    </div>
  );
}

export function GameStatus({ game }: { game: Game }) {
  const released = game.status === 'released';
  return <span className={`game-status ${released ? 'status-released' : ''}`}>{released ? 'Released' : 'In Development'}</span>;
}

export function Featured({ games }: { games: Game[] }) {
  const playable = games.filter((game) => game.entry !== null);
  const featured = playable.find((game) => game.featured && game.status === 'released')
    ?? playable.find((game) => game.status === 'released')
    ?? playable.find((game) => game.featured)
    ?? playable[0];

  return (
    <section className="featured" aria-label={featured ? 'Featured game' : 'Studio library banner'}>
      {featured && <GameArt game={featured} className="featured-art" />}
      {featured && (
        <div className="featured-content">
          <span className="eyebrow">Featured game</span>
          <h2>{featured.title}</h2>
          <p>{featured.description}</p>
          <a className="primary-button" href={`#/games/${featured.id}`}>View featured game <span className="arrow-icon" aria-hidden="true" /></a>
        </div>
      )}
      {!featured && <div className="featured-content">
        <h2>Ready for the next release</h2>
        <p>Play new games here as they arrive from AI Game Studio.</p>
      </div>}
    </section>
  );
}

export function Library({ games }: { games: Game[] }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [dimension, setDimension] = useState<DimensionFilter>('All');
  const categories = new Map<string, string>();
  for (const game of games) {
    for (const name of game.categories ?? []) {
      if (!categories.has(name.toLowerCase())) categories.set(name.toLowerCase(), name);
    }
  }

  const query = search.trim().toLowerCase();
  const visible = games.filter((game) =>
    (!query || [game.title, game.description, ...(game.categories ?? [])].some((value) => value.toLowerCase().includes(query))) &&
    (!category || game.categories?.some((name) => name.toLowerCase() === category)) &&
    (dimension === 'All' || game.dimension === dimension));

  function resetFilters() {
    setSearch('');
    setCategory('');
    setDimension('All');
  }

  return (
    <>
      <Featured games={games} />
      <section className="collection" aria-labelledby="collection-title">
        <div className="section-title">
          <h2 id="collection-title">Browse games</h2>
          <span className="result-count" aria-live="polite">{visible.length} {visible.length === 1 ? 'game' : 'games'}</span>
        </div>
        <div className="filters">
          <label className="search-field">
            <span className="search-icon" aria-hidden="true" />
            <input type="search" aria-label="Search games" placeholder="Search games" value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <label className="category-field">
            <select aria-label="Category" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">All categories</option>
              {[...categories].sort((a, b) => a[1].localeCompare(b[1])).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <div className="dimension-filters" role="group" aria-label="Game format">
            {(['All', '2D', '3D'] as const).map((value) => (
              <button key={value} type="button" aria-pressed={dimension === value} onClick={() => setDimension(value)}>{value}</button>
            ))}
          </div>
        </div>

        {visible.length ? (
          <ul className="game-list" aria-label="Game results">
            {visible.map((game) => (
              <li key={game.id} className="game-card">
                <GameArt game={game} className="card-art" />
                <div className="card-body">
                  <GameStatus game={game} />
                  <h3><a href={`#/games/${game.id}`}>{game.title}</a></h3>
                  <p>{game.description}</p>
                  {(game.dimension || !!game.categories?.length) && (
                    <div className="game-tags">{[game.dimension, ...(game.categories ?? [])].filter(Boolean).join(' · ')}</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            <div className="empty-icon" aria-hidden="true"><span /><span /><span /><span /></div>
            <h3>{games.length ? 'No matching games' : 'No games available yet'}</h3>
            <p>{games.length ? 'Try a different search or clear your filters.' : 'Published games will appear in this library.'}</p>
            {games.length > 0 && <button className="secondary-button" type="button" onClick={resetFilters}>Clear filters</button>}
          </div>
        )}
      </section>
    </>
  );
}
