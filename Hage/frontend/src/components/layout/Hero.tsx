
import { Link } from 'react-router-dom';
import styles from './Hero.module.css';

const Hero = () => {
  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        <h1 className={`${styles.title} animate-fade-in`}>
          Track Every Trade.<br />
          <span className="text-primary">Master Every Decision.</span>
        </h1>
        <p className={`${styles.subtitle} animate-slide-up`}>
          A professional trading journal helping traders improve discipline, performance, consistency and profitability.
        </p>
        <div className={`${styles.buttonGroup} animate-slide-up`}>
          <Link to="/register" className={styles.primaryBtn}>Get Started</Link>
          <Link to="/login" className={styles.secondaryBtn}>Login</Link>
        </div>
        
        <div className={`${styles.dashboardPreview} animate-slide-up`}>
          <div className={styles.mockupBrowser}>
            <div className={styles.mockupHeader}>
              <span className={styles.dot} style={{ backgroundColor: '#ff5f56' }}></span>
              <span className={styles.dot} style={{ backgroundColor: '#ffbd2e' }}></span>
              <span className={styles.dot} style={{ backgroundColor: '#27c93f' }}></span>
            </div>
            <div className={styles.mockupBody}>
              {/* Placeholder for dashboard mockup image */}
              <div className={styles.mockupContent}>
                <div className={styles.mockupSidebar}></div>
                <div className={styles.mockupMain}>
                  <div className={styles.mockupCardRow}>
                    <div className={styles.mockupCard}></div>
                    <div className={styles.mockupCard}></div>
                    <div className={styles.mockupCard}></div>
                  </div>
                  <div className={styles.mockupChart}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
