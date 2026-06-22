import styles from './styles/NoPermissionBanner.module.css';

type NoPermissionBannerProps = {
  message: string;
};

export function NoPermissionBanner({ message }: NoPermissionBannerProps): JSX.Element {
  return <p className={styles.banner}>{message}</p>;
}
