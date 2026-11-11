// Package profile describes the person using the app.
package profile

import (
	"fmt"
	"os/user"
	"strings"
)

// Profile is the current user as shown in the UI.
type Profile struct {
	Username    string `json:"username"`
	DisplayName string `json:"displayName"`
}

// LookupFunc returns the operating-system account running the app.
type LookupFunc func() (*user.User, error)

// Service is bound to the frontend.
type Service struct {
	lookup LookupFunc
}

// NewService constructs a Service that resolves users with lookup,
// typically user.Current.
func NewService(lookup LookupFunc) *Service {
	return &Service{lookup: lookup}
}

// Current returns the profile of the operating-system user running the app.
func (s *Service) Current() (Profile, error) {
	u, err := s.lookup()
	if err != nil {
		return Profile{}, fmt.Errorf("look up current user: %w", err)
	}

	return Profile{Username: u.Username, DisplayName: displayName(u)}, nil
}

// displayName prefers the account's full name. On Unix that is the first
// field of GECOS ("Full Name,room,phone,..."); it falls back to the login.
func displayName(u *user.User) string {
	name, _, _ := strings.Cut(u.Name, ",")
	if name = strings.TrimSpace(name); name != "" {
		return name
	}

	return u.Username
}
