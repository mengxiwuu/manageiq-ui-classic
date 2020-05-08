import React, { useEffect, useState } from 'react';
import cx from 'classnames';
import PropTypes from 'prop-types';
import {
  SideNav,
  SideNavHeader,
  SideNavIcon,
  SideNavItem,
  SideNavItems,
  SideNavLink,
  SideNavMenu,
  SideNavMenuItem,
} from 'carbon-components-react/es/components/UIShell';
import Link from 'carbon-components-react/es/components/UIShell/Link';
import { ChevronLeft20, ChevronRight20 } from '@carbon/icons-react';

import { GroupSwitcher } from './group-switcher';
import { MenuSearch } from './search';
import { SearchResults } from './search-results';
import { MiqLogo } from './miq-logo';
import { carbonizeIcon } from './icon';
import { itemId, linkProps } from './item-type';


const mapItems = (items, level = 0, root = true, setSection = null) => items.map((item) => (
  item.items.length
  ? (
    level
    ? <MenuSection key={item.id} level={level} {...item} />
    : <FirstLevelSection key={item.id} setSection={setSection} {...item} />
  )
  : (
    level
    ? <MenuItem key={item.id} {...item} />
    : <FirstLevelItem key={item.id} {...item} />
  )
));


const menuItemProps = {
  active: PropTypes.bool,
  href: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
};

// SideNavLink for first level - needed for icon
const FirstLevelItem = ({ active, href, icon, id, title, type }) => (
  <SideNavLink
    id={itemId(id)}
    isActive={active}
    renderIcon={carbonizeIcon(icon)}
    {...linkProps({ type, href, id })}
  >
    {title}
  </SideNavLink>
);

FirstLevelItem.props = {
  ...menuItemProps,
  icon: PropTypes.string,
};

// SideNavMenuItem can't render icon, but we only have first level icons
const MenuItem = ({ active, href, id, title, type }) => (
  <SideNavMenuItem
    id={itemId(id)}
    isActive={active}
    {...linkProps({ type, href, id })}
  >
    {title}
  </SideNavMenuItem>
);

MenuItem.props = {
  ...menuItemProps,
};


const menuSectionProps = {
  active: PropTypes.bool,
  icon: PropTypes.string,
  id: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(PropTypes.any).isRequired,
  title: PropTypes.string.isRequired,
};

// really a SideNavLink with a chevron from SideNavMenu instead of SideNavLinkText
const FirstLevelSection = ({ active, id, items, title, icon, setSection }) => {
  const className = cx({
    'bx--side-nav__link': true,
    'bx--side-nav__link--current': active,
  });
  const IconElement = carbonizeIcon(icon);

  return (
    <SideNavItem id={itemId(id, true)}>
      <Link
        className={className}
        onClick={() => setSection(items)}
      >
        {IconElement && (
          <SideNavIcon small>
            <IconElement />
          </SideNavIcon>
        )}

        <span className="bx--side-nav__submenu-title">
          {title}
        </span>

        <SideNavIcon className="bx--side-nav__submenu-chevron" small>
          <ChevronRight20 />
        </SideNavIcon>
      </Link>
    </SideNavItem>
  );
};

FirstLevelSection.props = {
  ...menuSectionProps,
};

const MenuSection = ({ active, id, items, title, icon, level }) => (
  <SideNavMenu
    id={itemId(id, true)}
    isActive={active}
    defaultExpanded={active} // autoexpand active section
    renderIcon={carbonizeIcon(icon)} // only first level sections have it, but all need the prop for consistent padding
    title={title}
  >
    {mapItems(items, level + 1, false)}
  </SideNavMenu>
);

MenuSection.props = {
  ...menuSectionProps,
};


const MenuCollapse = ({ expanded, toggle }) => (
  <SideNavItem className="menu-collapse">
    <div
      className="menu-collapse-button"
      onClick={toggle}
    >
      {expanded ? <ChevronLeft20 /> : <ChevronRight20 />}
    </div>
  </SideNavItem>
);

const Username = ({ applianceName, currentUser, expanded }) => {
  const title = `${currentUser.name} | ${currentUser.userid} | ${applianceName}`;
  const initials = Array.from(currentUser.name).filter((x) => x.match(/\p{Upper}/u)).join('').substr(0, 3) || currentUser.name[0];

  return (
    <SideNavItem>
      <p
        data-userid={currentUser.userid}
        id="username_display"
        title={title}
      >
        { expanded ? currentUser.name : initials }
      </p>
    </SideNavItem>
  );
};


const initialExpanded = window.localStorage.getItem('patternfly-navigation-primary') !== 'collapsed';

export const MainMenu = (props) => {
  const { applianceName, currentGroup, currentUser, customBrand, customLogo, logoLarge, logoSmall, menu, miqGroups, showLogo, showUser } = props;
  const [expanded, setExpanded] = useState(initialExpanded);
  const [activeSectionItems, setSection] = useState(null);
  const [searchResults, setSearch] = useState(null);

  let appearExpanded = expanded || !!activeSectionItems || !!searchResults;

  useEffect(() => {
    window.localStorage.setItem('patternfly-navigation-primary', expanded ? 'expanded' : 'collapsed');
  }, [expanded]);

  useEffect(() => {
    const classNames = {
      true: 'miq-main-menu-expanded',
      false: 'miq-main-menu-collapsed',
    };
    document.body.classList.remove(classNames[!appearExpanded]);
    document.body.classList.add(classNames[appearExpanded]);
  }, [appearExpanded]);

  const miqLogo = () => (
    <MiqLogo
      customBrand={customBrand}
      imagePath={appearExpanded ? logoLarge : logoSmall}
    />
  );

  return (
  <>
    <SideNav
      aria-label={__("Main Menu")}
      isChildOfHeader={false}
      expanded={appearExpanded}
    >
      {showLogo && <SideNavHeader
        renderIcon={miqLogo}
      />}

      {showUser && <Username
        applianceName={applianceName}
        currentUser={currentUser}
        expanded={appearExpanded}
      />}

      <GroupSwitcher
        currentGroup={currentGroup}
        expanded={appearExpanded}
        miqGroups={miqGroups}
      />

      <MenuSearch
        menu={menu}
        expanded={appearExpanded}
        onSearch={setSearch}
      />

      <hr className="bx--side-nav__hr" />

      { searchResults && (
        <SearchResults results={searchResults} />
      )}
      { !searchResults && (
        <SideNavItems>
          {mapItems(menu, 0, true, setSection)}
        </SideNavItems>
      )}

      <MenuCollapse
        expanded={expanded /* not appearExpanded */}
        toggle={() => setExpanded(!expanded)}
      />
    </SideNav>
    { activeSectionItems && (
      <SideNav
        aria-label={__("Main Menu 2")}
        className="second"
        expanded={true}
        isChildOfHeader={false}
      >
        <SideNavItems>
          {mapItems(activeSectionItems, 1, true, setSection)}
        </SideNavItems>
      </SideNav>
    )}
  </>
  );
};

const propGroup = PropTypes.shape({
  description: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
});

const propUser = PropTypes.shape({
  name: PropTypes.string.isRequired,
  userid: PropTypes.string.isRequired,
});

MainMenu.propTypes = {
  applianceName: PropTypes.string.isRequired,
  currentGroup: propGroup.isRequired,
  currentUser: propUser.isRequired,
  customBrand: PropTypes.bool.isRequired,
  customLogo: PropTypes.bool.isRequired,
  logoLarge: PropTypes.string,
  logoSmall: PropTypes.string,
  menu: PropTypes.arrayOf(PropTypes.any).isRequired,
  miqGroups: PropTypes.arrayOf(propGroup).isRequired,
  showLogo: PropTypes.bool,
  showUser: PropTypes.bool,
};

MainMenu.defaultProps = {
  showLogo: true,
  showUser: true,
};
