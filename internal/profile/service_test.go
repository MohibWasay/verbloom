package profile_test

import (
	"errors"
	"os/user"
	"testing"

	"verbloom/internal/profile"
)

func TestServiceCurrent(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		user user.User
		want profile.Profile
	}{
		{
			name: "full name",
			user: user.User{Username: "ada", Name: "Ada Lovelace"},
			want: profile.Profile{Username: "ada", DisplayName: "Ada Lovelace"},
		},
		{
			name: "GECOS with extra fields",
			user: user.User{Username: "ada", Name: "Ada Lovelace,Room 1,555-0100,,"},
			want: profile.Profile{Username: "ada", DisplayName: "Ada Lovelace"},
		},
		{
			name: "empty name falls back to login",
			user: user.User{Username: "ada", Name: ""},
			want: profile.Profile{Username: "ada", DisplayName: "ada"},
		},
		{
			name: "blank GECOS falls back to login",
			user: user.User{Username: "ada", Name: " ,,,"},
			want: profile.Profile{Username: "ada", DisplayName: "ada"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			svc := profile.NewService(func() (*user.User, error) { return &tt.user, nil })

			got, err := svc.Current()
			if err != nil {
				t.Fatalf("Current() error = %v", err)
			}
			if got != tt.want {
				t.Errorf("Current() = %+v, want %+v", got, tt.want)
			}
		})
	}
}

func TestServiceCurrentLookupError(t *testing.T) {
	t.Parallel()

	lookupErr := errors.New("no passwd entry")
	svc := profile.NewService(func() (*user.User, error) { return nil, lookupErr })

	_, err := svc.Current()

	if !errors.Is(err, lookupErr) {
		t.Fatalf("Current() error = %v, want wrapping %v", err, lookupErr)
	}
}
