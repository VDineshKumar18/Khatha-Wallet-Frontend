import logoImg from "./assets/landing/logo.svg";

function Header({ loggedIn, onLoginClick, onLogout }) {
  return (
    <div className="header">
      <div className="header-inner">
        <div className="logo-container" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={logoImg} alt="Khatha Wallet" style={{ height: '36px', width: 'auto' }} />
        </div>

        {loggedIn ? (
          <button onClick={onLogout}>Logout</button>
        ) : (
          <button onClick={onLoginClick}>Login</button>
        )}
      </div>
    </div>
  );
}

export default Header;

