import { Link } from 'react-router-dom';

const links = [
  {
    to: '/courses',
    title: 'Courses',
    desc: 'Add and manage courses, videos, and learning content',
    emoji: '📚',
  },
  {
    to: '/banners',
    title: 'Banners',
    desc: 'Home screen carousel and featured content',
    emoji: '🖼️',
  },
  {
    to: '/temples',
    title: 'Temples',
    desc: 'Temple locations, info, and coordinates',
    emoji: '🛕',
  },
  {
    to: '/audios',
    title: 'Audios',
    desc: 'Chants, mantras, and audio content',
    emoji: '🎵',
  },
];

export default function Dashboard() {
  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Manage content for the Prarthana user app</p>
      </div>
      <div className="card">
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
          Select a section below to add or edit content.
        </p>
      </div>
      <div className="dashboard-grid">
        {links.map((item) => (
          <Link key={item.to} to={item.to} className="dashboard-card">
            <span style={{ fontSize: '1.75rem' }}>{item.emoji}</span>
            <h3>{item.title}</h3>
            <p>{item.desc}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
